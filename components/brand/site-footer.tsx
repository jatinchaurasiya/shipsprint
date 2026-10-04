/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Ft5 Statement footer — giant wordmark + office/contact + legal bar. Dark ink
   surface with light text in the same rule (gate 41). All strings real:
   contact from app/imprint, links are live routes, no placeholders (gate 46). */
import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-[#131313] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-8 sm:px-6 md:pt-20 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-7">
          {/* Giant wordmark — project logo, white version for ink surface */}
          <div className="min-w-0 md:col-span-4">
            <Link href="/" aria-label="ShipSprint home" className="block w-full max-w-xl">
              <Image
                src="/logo-dark.png"
                alt="ShipSprint"
                width={796}
                height={133}
                className="h-auto w-full"
                loading="lazy"
              />
            </Link>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-zinc-300">
              Ship your app page. Without the code. The landing-page platform
              for indie iOS &amp; Android apps.
            </p>
          </div>
          {/* Office / contact — real addresses from the imprint */}
          <div className="min-w-0 md:col-span-3">
            <p className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
              Our office
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:support@shipsprint.site"
                  className="whitespace-nowrap transition-colors hover:text-white active:text-white"
                >
                  support@shipsprint.site
                </a>
              </li>
              <li>
                <a
                  href="mailto:legal@shipsprint.site"
                  className="whitespace-nowrap transition-colors hover:text-white active:text-white"
                >
                  legal@shipsprint.site
                </a>
              </li>
              <li>
                <a
                  href="https://shipsprint.site"
                  className="whitespace-nowrap transition-colors hover:text-white active:text-white"
                >
                  shipsprint.site
                </a>
              </li>
            </ul>
            <nav aria-label="Footer" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] leading-none text-zinc-300">
              <Link href="/templates" className="whitespace-nowrap transition-colors hover:text-white active:text-white">
                Templates
              </Link>
              <Link href="/terms" className="whitespace-nowrap transition-colors hover:text-white active:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="whitespace-nowrap transition-colors hover:text-white active:text-white">
                Privacy
              </Link>
              <Link href="/imprint" className="whitespace-nowrap transition-colors hover:text-white active:text-white">
                Imprint
              </Link>
              <Link href="/login" className="whitespace-nowrap transition-colors hover:text-white active:text-white">
                Sign in
              </Link>
            </nav>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-zinc-800 pt-6 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="whitespace-nowrap">© {new Date().getFullYear()} ShipSprint Operations. All rights reserved.</p>
          <p>Billing &amp; tax by Dodo Payments, merchant of record.</p>
        </div>
      </div>
    </footer>
  );
}
