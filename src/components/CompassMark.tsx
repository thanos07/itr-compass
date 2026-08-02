"use client";

type CompassMarkProps = {
  size?: number;
  className?: string;
};

export default function CompassMark({
  size = 36,
  className = "",
}: CompassMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="10"
        fill="#2954d8"
      />
      <rect
        x="1.5"
        y="1.5"
        width="33"
        height="33"
        rx="9.5"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
      />
      <circle
        cx="18"
        cy="18"
        r="10"
        fill="none"
        stroke="#dfe8ff"
        strokeWidth="1.5"
      />
      <path
        d="M23.4 10.6 20.5 20.5l-9.9 2.9 2.9-9.9 9.9-2.9Z"
        fill="#faf7f1"
      />
      <path
        d="m23.4 10.6-2.9 9.9-7-7 9.9-2.9Z"
        fill="#91adf4"
      />
      <circle cx="18" cy="18" r="2.15" fill="#0e1b33" />
      <path
        d="M18 5.8v2.4M18 27.8v2.4M5.8 18h2.4M27.8 18h2.4"
        stroke="#faf7f1"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
