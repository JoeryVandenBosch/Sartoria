type CrownMarkProps = {
  className?: string;
  title?: string;
};

export function CrownMark({ className, title }: CrownMarkProps) {
  const labelled = Boolean(title);

  return (
    <svg
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
      className={className}
      fill="none"
      role={labelled ? "img" : undefined}
      viewBox="0 0 64 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 36h48M12 31l-3-18 14 10L32 7l9 16 14-10-3 18H12Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
      <path d="M18 39h28" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
      <circle cx="9" cy="12" fill="currentColor" r="2.3" />
      <circle cx="32" cy="6" fill="currentColor" r="2.3" />
      <circle cx="55" cy="12" fill="currentColor" r="2.3" />
    </svg>
  );
}
