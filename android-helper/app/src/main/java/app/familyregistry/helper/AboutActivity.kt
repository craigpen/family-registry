package app.familyregistry.helper

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** Opened from the launcher: says what the helper does, and opens the wish list. */
class AboutActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(56, 48, 56, 40)
            setBackgroundColor(Color.WHITE)
        }
        box.addView(TextView(this).apply {
            setText(R.string.about)
            textSize = 18f
            setTextColor(Color.rgb(42, 33, 28))
        })
        box.addView(Button(this).apply {
            text = "Open my wish list"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.APP_URL)))
                finish()
            }
        })
        setContentView(box)
    }
}
