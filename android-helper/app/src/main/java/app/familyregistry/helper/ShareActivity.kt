package app.familyregistry.helper

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.Gravity
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.google.androidbrowserhelper.trusted.LauncherActivity
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.concurrent.thread

/**
 * Add to wish list, from the Share menu (PLAN.md "Android share helper"). The app's icon opens
 * the site itself, full-screen (LauncherActivity, in the manifest).
 *
 * 1. Takes the first link from the shared text, keeping the rest as a title hint.
 * 2. Fetches the page natively (CORS doesn't apply here), following redirects, at most ~2 MB, ~5 s.
 * 3. Runs the shared extract.js over the HTML in an off-screen WebView (DOMParser: the shop's
 *    own scripts never run).
 * 4. Shrinks up to three candidate photos to small WebP thumbnails.
 * 5. Opens the wish list's /add#… page, then closes. On any failure it opens /add with just the
 *    link and hint: it never blocks adding a gift.
 */
class ShareActivity : Activity() {
    private val main = Handler(Looper.getMainLooper())
    private var done = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
        val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT).orEmpty()
        val url = Regex("""https?://\S+""").find(text)?.value
        val hint = text.replace(url ?: "", "").trim().ifEmpty { subject }
        if (url == null) {
            openAdd(mapOf("text" to text.ifEmpty { subject }), emptyList())
            return
        }
        reached = url
        showWaiting()
        // Whatever happens, don't keep the person waiting more than a few seconds.
        main.postDelayed({ fallback(hint) }, 9000)

        thread {
            try {
                val (html, finalUrl) = fetchPage(url)
                main.post { extract(html, finalUrl, hint) }
            } catch (e: Exception) {
                main.post { fallback(hint) }
            }
        }
    }

    /**
     * The furthest address reached. A short link (a.co/d/…) leads to the shop's full address,
     * which often holds the product's name (/adidas-Daily-4-0-Sneakers/dp/…). Keep it even when
     * the page itself can't be read, so the app can make a name from it.
     */
    @Volatile private var reached = ""

    /** Couldn't read the page: the link (as far as it got) and the shared text, for the app to guess from. */
    private fun fallback(hint: String) = openAdd(mapOf("url" to reached, "text" to hint), emptyList())

    private fun showWaiting() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(48, 40, 48, 40)
            setBackgroundColor(Color.WHITE)
        }
        box.addView(ProgressBar(this))
        box.addView(TextView(this).apply {
            setText(R.string.getting_details)
            textSize = 18f
            setPadding(32, 0, 0, 0)
        })
        setContentView(box)
    }

    private fun fetchPage(start: String): Pair<String, String> {
        var url = start
        repeat(6) {
            val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 5000
                readTimeout = 5000
                setRequestProperty("User-Agent", USER_AGENT)
                setRequestProperty("Accept", "text/html,application/xhtml+xml")
                setRequestProperty("Accept-Language", "en-US,en;q=0.9")
            }
            val code = conn.responseCode
            if (code in 300..399) {
                val next = conn.getHeaderField("Location") ?: throw IllegalStateException("redirect without location")
                url = URL(URL(url), next).toString()
                reached = url
                conn.disconnect()
                return@repeat
            }
            if (code !in 200..299) throw IllegalStateException("HTTP $code")
            val html = conn.inputStream.use { readAtMost(it, MAX_PAGE_BYTES) }.toString(Charsets.UTF_8)
            conn.disconnect()
            return html to url
        }
        throw IllegalStateException("too many redirects")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun extract(html: String, pageUrl: String, hint: String) {
        val web = WebView(this)
        web.settings.javaScriptEnabled = true
        val script = assets.open("extract.js").bufferedReader().use { it.readText() }
        val call = "$script\n;JSON.stringify(FamilyRegistryExtract.extract(new DOMParser().parseFromString(" +
            JSONObject.quote(html) + ", 'text/html'), " + JSONObject.quote(pageUrl) + "))"
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String?) {
                view.webViewClient = WebViewClient()
                view.evaluateJavascript(call) { raw -> handle(raw, pageUrl, hint) }
            }
        }
        web.loadDataWithBaseURL("https://localhost/", "<html></html>", "text/html", "utf-8", null)
    }

    private fun handle(raw: String?, pageUrl: String, hint: String) {
        run {
            try {
                // evaluateJavascript hands back a JSON string literal holding our JSON.
                val found = JSONObject(JSONObject("{\"v\":$raw}").getString("v"))
                // A robot check or error page instead of the product: don't take its title or pictures.
                val title = found.optString("title").trim()
                if (title.isEmpty() || (!found.optBoolean("product") && BLOCKED.containsMatchIn(title))) {
                    fallback(hint)
                    return@run
                }
                val images = found.optJSONArray("images")
                val candidates = (0 until (images?.length() ?: 0)).map { images!!.getString(it) }
                thread {
                    val thumbs = candidates.take(3).mapNotNull { runCatching { thumbnail(it) }.getOrNull() }
                    main.post {
                        openAdd(mapOf(
                            "url" to found.optString("url", pageUrl),
                            "title" to found.optString("title"),
                            "price" to found.optString("price"),
                            "site" to found.optString("site"),
                            "notes" to found.optString("notes"),
                        ), thumbs.ifEmpty { candidates.take(3) })
                    }
                }
            } catch (e: Exception) {
                fallback(hint)
            }
        }
    }

    /** A photo shrunk to a WebP data: URL of at most ~30 KB, like the app's own photos. */
    private fun thumbnail(src: String): String {
        val conn = (URL(src).openConnection() as HttpURLConnection).apply {
            connectTimeout = 4000
            readTimeout = 4000
            setRequestProperty("User-Agent", USER_AGENT)
        }
        val bytes = conn.inputStream.use { readAtMost(it, 8_000_000) }
        conn.disconnect()
        val original = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: throw IllegalStateException("not an image")
        var side = 640
        while (side >= 200) {
            val scale = minOf(1f, side.toFloat() / maxOf(original.width, original.height))
            val bmp = Bitmap.createScaledBitmap(original, maxOf(1, (original.width * scale).toInt()), maxOf(1, (original.height * scale).toInt()), true)
            for (quality in listOf(80, 60, 45)) {
                val out = ByteArrayOutputStream()
                @Suppress("DEPRECATION")
                val format = if (Build.VERSION.SDK_INT >= 30) Bitmap.CompressFormat.WEBP_LOSSY else Bitmap.CompressFormat.WEBP
                bmp.compress(format, quality, out)
                val data = "data:image/webp;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
                if (data.length <= MAX_THUMB) return data
            }
            side = (side * 0.8).toInt()
        }
        throw IllegalStateException("photo too big")
    }

    /** Opens the wish list's Add sheet: /add#url=…&title=…&image=…(repeatable)&price=…&site=… */
    private fun openAdd(fields: Map<String, String>, images: List<String>) {
        if (done) return
        done = true
        val parts = fields.filterValues { it.isNotBlank() }.map { (k, v) -> "$k=${enc(v)}" } + images.map { "image=${enc(it)}" }
        val target = Uri.parse(BuildConfig.APP_URL + "add#" + parts.joinToString("&"))
        // Opens in this app's own full-screen window (it falls back to a Custom Tab without a capable browser).
        startActivity(Intent(this, LauncherActivity::class.java).setData(target).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

    private fun readAtMost(input: InputStream, max: Int): ByteArray {
        val out = ByteArrayOutputStream()
        val buf = ByteArray(16 * 1024)
        while (out.size() < max) {
            val n = input.read(buf)
            if (n < 0) break
            out.write(buf, 0, minOf(n, max - out.size()))
        }
        return out.toByteArray()
    }

    companion object {
        private const val MAX_PAGE_BYTES = 2_000_000
        private const val MAX_THUMB = 30_000
        /** Titles of the pages shops show robots instead of the product. */
        private val BLOCKED = Regex("""^(amazon(\.[a-z.]+)?|robot check|sorry\b.*|access denied|attention required.*|just a moment.*|page not found)$""", RegexOption.IGNORE_CASE)
        private const val USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
    }
}
