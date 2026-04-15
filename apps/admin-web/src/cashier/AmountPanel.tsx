import type { RefObject } from "react";

const KEYPAD_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "clear",
  "0",
  "back",
] as const;

type AmountPanelProps = {
  title: string;
  hint: string;
  keypadClear: string;
  keypadBack: string;
  amountRef: RefObject<HTMLInputElement>;
  amountInput: string;
  onAmountChange: (digits: string) => void;
  onKeypad: (key: (typeof KEYPAD_KEYS)[number]) => void;
};

export function AmountPanel({
  title,
  hint,
  keypadClear,
  keypadBack,
  amountRef,
  amountInput,
  onAmountChange,
  onKeypad,
}: AmountPanelProps) {
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
      aria-labelledby="cashier-amount-heading"
    >
      <h2
        id="cashier-amount-heading"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        {title}
      </h2>
      <label className="block">
        <span className="sr-only">{title}</span>
        <input
          ref={amountRef}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="0"
          className="w-full border-0 border-b-2 border-slate-200 bg-transparent px-1 py-2 text-center text-5xl font-semibold tabular-nums text-slate-900 outline-none transition focus-visible:border-indigo-500 min-[768px]:py-3 md:text-6xl"
          value={amountInput}
          onChange={(e) => onAmountChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
        />
      </label>
      <p className="text-center text-xs text-slate-500">{hint}</p>
      <div
        className="grid grid-cols-3 gap-2 sm:gap-3"
        aria-label={title}
      >
        {KEYPAD_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="h-12 min-h-[48px] touch-manipulation rounded-xl border border-slate-200 bg-slate-50 text-lg font-medium text-slate-800 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500 md:h-14 md:min-h-[56px]"
            onClick={() => onKeypad(k)}
          >
            {k === "clear" ? keypadClear : k === "back" ? keypadBack : k}
          </button>
        ))}
      </div>
    </section>
  );
}
