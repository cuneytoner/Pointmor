import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useLocaleActions } from "../../contexts/LocaleContext";
import { useTranslation } from "../../hooks/useTranslation";
import { getPublicMenu, type PublicMenuPayload } from "../../lib/public-menu-api";
import {
  resolveLanguage,
  resolveUiLocale,
  tenantLanguageStorageKey,
} from "../../lib/resolveLanguage";
import "./customer-menu.css";

function formatMoney(minor: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "EUR",
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function estimatePointsFromPrice(priceMinor: number, pointsPerMajorMinor: number): number {
  const div = pointsPerMajorMinor > 0 ? pointsPerMajorMinor : 100;
  return Math.max(1, Math.floor(priceMinor / div));
}

type MenuItemRowProps = {
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  locale: string;
  imageUrl: string | null;
  pointsHint: string | null;
};

const MenuItemCard = memo(function MenuItemCard({
  name,
  description,
  priceMinor,
  currency,
  locale,
  imageUrl,
  pointsHint,
}: MenuItemRowProps) {
  return (
    <article className="customer-menu-page__item">
      {imageUrl ? (
        <img
          className="customer-menu-page__item-img"
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ) : (
        <div className="customer-menu-page__item-img customer-menu-page__item-img--placeholder" aria-hidden />
      )}
      <div className="customer-menu-page__item-body">
        <h3 className="customer-menu-page__item-name">{name}</h3>
        {description ? (
          <p className="customer-menu-page__item-desc">{description}</p>
        ) : null}
      </div>
      <div className="customer-menu-page__price-col">
        <span className="customer-menu-page__price">
          {formatMoney(priceMinor, currency, locale)}
        </span>
        {pointsHint ? (
          <span className="customer-menu-page__points-hint">{pointsHint}</span>
        ) : null}
      </div>
    </article>
  );
});

function MenuPageSkeleton({ primary }: { primary: string }) {
  return (
    <div
      className="customer-menu-page customer-menu-page--loading"
      style={{ ["--cm-primary" as string]: primary }}
    >
      <div className="customer-menu-page__sticky-head customer-menu-page__sticky-head--skeleton">
        <div className="customer-menu-page__header customer-menu-page__header--compact">
          <div
            className="customer-menu-page__skeleton customer-menu-page__logo"
            aria-hidden
          />
          <div className="customer-menu-page__header-text">
            <div className="customer-menu-page__skeleton customer-menu-page__sk-line" />
            <div
              className="customer-menu-page__skeleton customer-menu-page__sk-line"
              style={{ width: "55%" }}
            />
          </div>
        </div>
        <div className="customer-menu-page__tabs customer-menu-page__tabs--skeleton" aria-hidden>
          <span className="customer-menu-page__skeleton customer-menu-page__sk-pill" />
          <span className="customer-menu-page__skeleton customer-menu-page__sk-pill" />
          <span className="customer-menu-page__skeleton customer-menu-page__sk-pill" />
        </div>
      </div>
      <div className="customer-menu-page__main customer-menu-page__main--pad">
        {[0, 1, 2].map((i) => (
          <div key={i} className="customer-menu-page__skeleton-row">
            <div className="customer-menu-page__skeleton customer-menu-page__sk-block" />
            <div className="customer-menu-page__skeleton-text">
              <div className="customer-menu-page__skeleton customer-menu-page__sk-line" />
              <div
                className="customer-menu-page__skeleton customer-menu-page__sk-line"
                style={{ width: "70%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerMenuPage() {
  const { tenantSlug = "" } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const { setLocale } = useLocaleActions();
  const { t, locale } = useTranslation();

  const [data, setData] = useState<PublicMenuPayload | null>(null);
  const [error, setError] = useState<"load" | "disabled" | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const stickyHeadRef = useRef<HTMLDivElement>(null);
  const scrollSpyRaf = useRef<number | null>(null);
  const userClickScrollRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    getPublicMenu(tenantSlug)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        const status = (e as { status?: number }).status;
        if (!cancelled) {
          if (status === 403) setError("disabled");
          else setError("load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  const resolvedUiLocale = useMemo(() => {
    if (!data) return locale;
    const ss = data.storeSettings;
    const raw = resolveLanguage({
      langParam: searchParams.get("lang"),
      tenantSlug,
      supportedLanguages: ss.supportedLanguages?.length
        ? ss.supportedLanguages
        : ["en"],
      defaultLanguage: ss.defaultLanguage ?? "en",
      navigatorLanguages:
        typeof navigator !== "undefined" ? navigator.languages : [],
    });
    try {
      localStorage.setItem(tenantLanguageStorageKey(tenantSlug), raw);
    } catch {
      /* ignore */
    }
    return resolveUiLocale(raw);
  }, [data, locale, searchParams, tenantSlug]);

  useEffect(() => {
    if (data) setLocale(resolvedUiLocale);
  }, [data, resolvedUiLocale, setLocale]);

  const primary = data?.storeSettings.primaryColor ?? "#0056b3";

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? "#0a1628";
    meta?.setAttribute("content", primary);
    return () => {
      meta?.setAttribute("content", prev);
    };
  }, [primary]);

  const categories = data?.categories ?? [];
  const displayCurrency = data?.storeSettings.currency ?? "EUR";
  const loc = resolvedUiLocale;

  const pointsDiv = data?.loyaltyPreview.pointsPerMajorMinor ?? 100;

  const ctaVariant = useMemo((): "default" | "alt" => {
    const q = searchParams.get("cta")?.toLowerCase();
    if (q === "alt" || q === "b") return "alt";
    if (q === "default" || q === "a") return "default";
    return data?.loyaltyPreview.ctaVariant === "alt" ? "alt" : "default";
  }, [data?.loyaltyPreview.ctaVariant, searchParams]);

  const hasAnyItem = useMemo(
    () => categories.some((c) => c.items.length > 0),
    [categories],
  );

  /** İlk ürünlü kategoriden sonra tek seferlik teaser */
  const teaserAfterIndex = useMemo(() => {
    const i = categories.findIndex((c) => c.items.length > 0);
    return i >= 0 ? i : -1;
  }, [categories]);

  useEffect(() => {
    if (!data || categories.length === 0) return;
    const firstWith = categories.find((c) => c.items.length > 0);
    setActiveCategoryId((firstWith ?? categories[0]).id);
  }, [data, categories]);

  useLayoutEffect(() => {
    const el = stickyHeadRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--cm-sticky-h", `${Math.ceil(h)}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--cm-sticky-h");
    };
  }, [data, hasAnyItem, categories.length]);

  const updateActiveFromScroll = useCallback(() => {
    if (userClickScrollRef.current) return;
    const stickyBottom = stickyHeadRef.current?.getBoundingClientRect().bottom ?? 96;
    let currentId = categories[0]?.id ?? null;
    for (const cat of categories) {
      const section = document.getElementById(`menu-section-${cat.id}`);
      if (!section) continue;
      const top = section.getBoundingClientRect().top;
      if (top <= stickyBottom + 4) {
        currentId = cat.id;
      }
    }
    if (currentId) setActiveCategoryId(currentId);
  }, [categories]);

  useEffect(() => {
    if (!data || categories.length === 0) return;
    const onScroll = () => {
      if (scrollSpyRaf.current !== null) return;
      scrollSpyRaf.current = window.requestAnimationFrame(() => {
        scrollSpyRaf.current = null;
        updateActiveFromScroll();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateActiveFromScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollSpyRaf.current !== null) cancelAnimationFrame(scrollSpyRaf.current);
    };
  }, [data, categories, updateActiveFromScroll]);

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      const section = document.getElementById(`menu-section-${categoryId}`);
      if (!section) return;
      userClickScrollRef.current = true;
      setActiveCategoryId(categoryId);
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        userClickScrollRef.current = false;
      }, 600);
    },
    [],
  );

  const showCategoryTabs = categories.length > 1;

  const loyaltyPath = `/c/${encodeURIComponent(tenantSlug)}`;

  if (!data && !error) {
    return <MenuPageSkeleton primary={primary} />;
  }

  if (error === "disabled") {
    return (
      <div className="customer-menu-page customer-menu-page--centered">
        <p className="customer-menu-page__banner" role="alert">
          {t("publicMenu.disabled")}
        </p>
      </div>
    );
  }

  if (error === "load" || !data) {
    return (
      <div className="customer-menu-page customer-menu-page--centered">
        <p className="customer-menu-page__banner" role="alert">
          {t("publicMenu.loadError")}
        </p>
      </div>
    );
  }

  const lp = data.loyaltyPreview;
  const teaserTitle = lp.teaserTitle?.trim() || t("publicMenu.teaserFallbackTitle");
  const teaserBody = lp.teaserBody?.trim() || t("publicMenu.teaserFallbackBody");
  const bottomCtaLabel =
    ctaVariant === "alt" ? t("publicMenu.ctaButtonAlt") : t("publicMenu.ctaButton");

  return (
    <div
      className="customer-menu-page"
      style={{ ["--cm-primary" as string]: primary }}
    >
      <div ref={stickyHeadRef} className="customer-menu-page__sticky-head">
        <header className="customer-menu-page__header customer-menu-page__header--compact">
          {data.storeSettings.logoUrl ? (
            <img
              className="customer-menu-page__logo"
              src={data.storeSettings.logoUrl}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div
              className="customer-menu-page__logo customer-menu-page__logo--brand"
              style={{ background: `linear-gradient(135deg, ${primary}33, ${primary}18)` }}
              aria-hidden
            />
          )}
          <div className="customer-menu-page__header-text">
            <p className="customer-menu-page__eyebrow">{t("publicMenu.eyebrow")}</p>
            <h1 className="customer-menu-page__title">{data.storeSettings.storeName}</h1>
          </div>
        </header>

        {showCategoryTabs ? (
          <nav
            className="customer-menu-page__tabs"
            aria-label={t("publicMenu.tabsAria")}
          >
            <div className="customer-menu-page__tabs-track">
              {categories.map((cat) => {
                const active = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`menu-section-${cat.id}`}
                    id={`menu-tab-${cat.id}`}
                    className={`customer-menu-page__tab${active ? " customer-menu-page__tab--active" : ""}`}
                    onClick={() => scrollToCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : null}
      </div>

      <main className="customer-menu-page__main">
        {!hasAnyItem ? (
          <p className="customer-menu-page__empty customer-menu-page__empty--global">
            {t("publicMenu.empty")}
          </p>
        ) : (
          categories.map((cat, catIdx) => (
            <Fragment key={cat.id}>
              <section
                id={`menu-section-${cat.id}`}
                className="customer-menu-page__section"
                aria-labelledby={`menu-heading-${cat.id}`}
              >
                <div className="customer-menu-page__section-head">
                  <h2
                    id={`menu-heading-${cat.id}`}
                    className="customer-menu-page__section-title"
                  >
                    {cat.name}
                  </h2>
                  {cat.description ? (
                    <p className="customer-menu-page__section-desc">{cat.description}</p>
                  ) : null}
                </div>
                {cat.items.length === 0 ? (
                  <p className="customer-menu-page__empty customer-menu-page__empty--category">
                    {t("publicMenu.categoryEmpty")}
                  </p>
                ) : (
                  <ul className="customer-menu-page__list" role="list">
                    {cat.items.map((it) => {
                      const est = estimatePointsFromPrice(it.price, pointsDiv);
                      const hint = t("publicMenu.pointsHint", { n: est });
                      return (
                        <li key={it.id} className="customer-menu-page__list-item">
                          <MenuItemCard
                            name={it.name}
                            description={it.description}
                            priceMinor={it.price}
                            currency={it.currency ?? displayCurrency}
                            locale={loc}
                            imageUrl={it.imageUrl}
                            pointsHint={hint}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {hasAnyItem && catIdx === teaserAfterIndex ? (
                <aside
                  className="customer-menu-page__loyalty-teaser"
                  aria-label={t("publicMenu.teaserAria")}
                >
                  <p className="customer-menu-page__teaser-kicker">{t("publicMenu.teaserKicker")}</p>
                  <h3 className="customer-menu-page__teaser-title">{teaserTitle}</h3>
                  <p className="customer-menu-page__teaser-body">{teaserBody}</p>
                  <Link className="customer-menu-page__teaser-cta" to={loyaltyPath}>
                    {t("publicMenu.teaserCta")}
                  </Link>
                </aside>
              ) : null}
            </Fragment>
          ))
        )}
      </main>

      <div className="customer-menu-page__cta-wrap">
        <div className="customer-menu-page__cta-inner">
          <p className="customer-menu-page__cta-hint">{t("publicMenu.ctaHint")}</p>
          <p className="customer-menu-page__cta-micro">{t("publicMenu.pointsHintDisclaimer")}</p>
          <Link className="customer-menu-page__cta-btn" to={loyaltyPath}>
            {bottomCtaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
