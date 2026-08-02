import { ImageResponse } from "next/og";

export const alt =
  "ITR Compass — prepare, compare and review your income-tax workpaper";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#faf7f1",
        color: "#0e1b33",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -110,
          top: -120,
          width: 460,
          height: 460,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(41,84,216,0.18) 0%, rgba(41,84,216,0) 70%)",
        }}
      />

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 82,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 64 64"
          >
            <rect
              width="64"
              height="64"
              rx="17"
              fill="#0e1b33"
            />
            <rect
              x="7"
              y="7"
              width="50"
              height="50"
              rx="15"
              fill="#2954d8"
            />
            <circle
              cx="32"
              cy="32"
              r="15.5"
              fill="none"
              stroke="#dfe8ff"
              strokeWidth="2.5"
            />
            <path
              d="M40.6 20.2 36 36l-15.8 4.6L24.8 24l15.8-3.8Z"
              fill="#faf7f1"
            />
            <path
              d="M40.6 20.2 36 36 24.8 24l15.8-3.8Z"
              fill="#91adf4"
            />
            <circle
              cx="32"
              cy="32"
              r="3.4"
              fill="#0e1b33"
            />
          </svg>

          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            ITR
            <span
              style={{
                color: "#2954d8",
                marginLeft: 18,
              }}
            >
              Compass
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 34,
          }}
        >
          <div
            style={{
              width: 28,
              height: 2,
              background: "#2954d8",
            }}
          />

          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2.2,
              color: "#2954d8",
            }}
          >
            AY 2026-27 · INDIA
          </span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 930,
            fontSize: 31,
            lineHeight: 1.35,
            color: "#5c6679",
          }}
        >
          Prepare, compare, and review your
          income-tax workpaper.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 46,
            gap: 14,
          }}
        >
          {[
            "Form screening",
            "Regime comparison",
            "Evidence review",
            "Encrypted backup",
          ].map((label, index) => (
            <span
              key={label}
              style={{
                padding: "12px 18px",
                border:
                  index === 0
                    ? "1px solid #d9e2f8"
                    : "1px solid #e4dcc9",
                background:
                  index === 0
                    ? "#e9edfb"
                    : "#fffdf9",
                color:
                  index === 0
                    ? "#1d3fae"
                    : "#182033",
                borderRadius: 8,
                fontSize: 18,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
