export default function PatternDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <pattern id="mH" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#c0c0c0" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#a0a0a0" strokeWidth="1.2" />
        </pattern>
        <pattern id="mHd" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#ccc" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#aaa" strokeWidth="1" />
        </pattern>
      </defs>
    </svg>
  );
}
