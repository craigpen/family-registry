import * as Dialog from '@radix-ui/react-dialog';
import type { CSSProperties, ReactNode } from 'react';

/**
 * A bottom sheet on phones, a centred card on wide screens. Escape and tapping outside close it.
 * The heading is the dialog's accessible name.
 */
export function Sheet({ open, onClose, heading, headingStyle, above, children }: {
  open: boolean; onClose: () => void; heading: ReactNode; headingStyle?: CSSProperties; above?: ReactNode; children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content className="sheet" aria-describedby={undefined}>
          <div className="grab" />
          {children === null ? null : <>
            {above}
            <Dialog.Title style={headingStyle}>{heading}</Dialog.Title>
            {children}
          </>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
