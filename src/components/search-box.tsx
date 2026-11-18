"use client";

// A search field with a round X to clear it.
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted focus-within:border-accent">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="text"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base leading-none text-muted hover:text-foreground"
        >
          ×
        </button>
      )}
    </div>
  );
}
