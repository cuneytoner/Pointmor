import type { RefObject } from "react";
import type { CustomerWithBalance } from "../lib/tenant-loyalty-api";

type CustomerPanelProps = {
  searchPlaceholder: string;
  noMatches: string;
  pointsSuffix: string;
  quickCreateLabel: string;
  qcNameLabel: string;
  qcPhoneLabel: string;
  qcSubmitLabel: string;
  selectedHeading: string;
  recentHeading: string;
  searchRef: RefObject<HTMLInputElement>;
  customerQuery: string;
  onCustomerQueryChange: (v: string) => void;
  filteredCustomers: CustomerWithBalance[];
  recentCustomers: CustomerWithBalance[];
  selectedCustomer: CustomerWithBalance | null;
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  quickCreateOpen: boolean;
  onToggleQuickCreate: () => void;
  qcName: string;
  qcPhone: string;
  onQcNameChange: (v: string) => void;
  onQcPhoneChange: (v: string) => void;
  onQuickCreateSubmit: () => void;
  quickCreateBusy: boolean;
};

export function CustomerPanel({
  searchPlaceholder,
  noMatches,
  pointsSuffix,
  quickCreateLabel,
  qcNameLabel,
  qcPhoneLabel,
  qcSubmitLabel,
  selectedHeading,
  recentHeading,
  searchRef,
  customerQuery,
  onCustomerQueryChange,
  filteredCustomers,
  recentCustomers,
  selectedCustomer,
  selectedCustomerId,
  onSelectCustomer,
  quickCreateOpen,
  onToggleQuickCreate,
  qcName,
  qcPhone,
  onQcNameChange,
  onQcPhoneChange,
  onQuickCreateSubmit,
  quickCreateBusy,
}: CustomerPanelProps) {
  const displaySelected =
    selectedCustomer ??
    filteredCustomers.find((c) => c.id === selectedCustomerId) ??
    recentCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
      aria-labelledby="cashier-customer-heading"
    >
      <h2
        id="cashier-customer-heading"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        {selectedHeading}
      </h2>
      <label className="block">
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          ref={searchRef}
          type="search"
          autoComplete="off"
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-slate-400 transition focus-visible:ring-2"
          value={customerQuery}
          onChange={(e) => onCustomerQueryChange(e.target.value)}
        />
      </label>

      {displaySelected ? (
        <div
          className="rounded-xl border-2 border-indigo-500 bg-indigo-50/80 px-3 py-3"
          aria-current="true"
        >
          <p className="text-xs font-medium uppercase text-indigo-700">
            {selectedHeading}
          </p>
          <p className="text-lg font-semibold text-slate-900">{displaySelected.name}</p>
          <p className="text-sm text-slate-600">{displaySelected.phone}</p>
          <p className="mt-1 text-sm font-medium text-indigo-900">
            {(displaySelected.loyaltyAccount?.pointsBalance ?? 0).toLocaleString()}{" "}
            {pointsSuffix}
          </p>
        </div>
      ) : null}

      {recentCustomers.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">{recentHeading}</p>
          <ul className="flex flex-wrap gap-2" role="list">
            {recentCustomers.map((c) => {
              const active = c.id === selectedCustomerId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(c.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      active
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="max-h-56 overflow-auto rounded-xl border border-slate-100">
        {filteredCustomers.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">{noMatches}</p>
        ) : (
          <ul className="divide-y divide-slate-100" role="listbox">
            {filteredCustomers.map((c) => {
              const active = c.id === selectedCustomerId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onSelectCustomer(c.id)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                      active ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium text-slate-900">{c.name}</span>
                    <span className="text-slate-600">{c.phone}</span>
                    <span className="text-xs text-slate-500">
                      {(c.loyaltyAccount?.pointsBalance ?? 0).toLocaleString()}{" "}
                      {pointsSuffix}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500"
        onClick={onToggleQuickCreate}
      >
        {quickCreateLabel}
      </button>

      {quickCreateOpen ? (
        <div
          className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 p-3"
          data-cashier-suppress-enter
        >
          <label className="block text-sm">
            <span className="text-slate-600">{qcNameLabel}</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={qcName}
              onChange={(e) => onQcNameChange(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">{qcPhoneLabel}</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
              value={qcPhone}
              onChange={(e) => onQcPhoneChange(e.target.value)}
              inputMode="tel"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={quickCreateBusy || !qcName.trim() || !qcPhone.trim()}
            onClick={onQuickCreateSubmit}
          >
            {qcSubmitLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
