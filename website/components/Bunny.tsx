// Bunny marks, drawn from the same few primitives as the product's canvas
// (soft ellipses, single color). They inherit currentColor so each placement
// picks its own tone.

// Sitting bunny in profile, ears swept back. Used in the nav wordmark.
export function Bunny({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="30" cy="17" rx="4.6" ry="12.5" transform="rotate(20 30 17)" />
      <ellipse cx="21.5" cy="15.5" rx="4.6" ry="13" transform="rotate(3 21.5 15.5)" />
      <circle cx="21" cy="33" r="9.5" />
      <ellipse cx="36" cy="45" rx="17" ry="13.5" />
      <circle cx="52.5" cy="49" r="5" />
    </svg>
  );
}

// A bunny peeking out of its hole — ears up, nose over the rim. Waits at the
// bottom of the page for whoever scrolls all the way down.
export function BunnyPeek({ width = 120 }: { width?: number }) {
  return (
    <svg
      width={width}
      height={width * (72 / 140)}
      viewBox="0 0 140 72"
      aria-hidden="true"
    >
      <ellipse
        cx="56.5"
        cy="30"
        rx="3.2"
        ry="9.5"
        transform="rotate(-30 56.5 30)"
        fill="currentColor"
      />
      <ellipse
        cx="83.5"
        cy="30"
        rx="3.2"
        ry="9.5"
        transform="rotate(30 83.5 30)"
        fill="currentColor"
      />
      <circle cx="70" cy="46" r="12.5" fill="currentColor" />
      <circle cx="70" cy="33" r="4.2" fill="currentColor" />
      <ellipse
        cx="70"
        cy="57"
        rx="30"
        ry="8.5"
        fill="#131211"
        stroke="rgba(143, 170, 240, 0.32)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
