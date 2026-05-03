export function Spinner(): React.JSX.Element {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M13 7.5a5.5 5.5 0 0 0-5.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 7.5 7.5"
          to="360 7.5 7.5"
          dur="0.7s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}
