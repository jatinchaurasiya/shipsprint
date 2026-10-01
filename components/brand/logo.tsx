import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

interface ShipSprintLogoProps {
  className?: string;
  variant?: "full" | "icon";
  href?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}

export function ShipSprintLogo({
  className,
  variant = "full",
  href,
  size = "md",
  priority = false,
}: ShipSprintLogoProps) {
  const heightClass = {
    sm: variant === "icon" ? "h-5 w-auto" : "h-6 w-auto",
    md: variant === "icon" ? "h-6 w-auto" : "h-7 w-auto",
    lg: variant === "icon" ? "h-8 w-auto" : "h-9 w-auto",
  }[size];

  const content = (
    <div className={clsx("inline-flex items-center select-none", className)}>
      {variant === "full" ? (
        <>
          {/* Light Mode Full Logo */}
          <Image
            src="/logo.png"
            alt="ShipSprint"
            width={796}
            height={133}
            className={clsx(heightClass, "object-contain dark:hidden")}
            priority={priority}
          />
          {/* Dark Mode Full Logo */}
          <Image
            src="/logo-dark.png"
            alt="ShipSprint"
            width={796}
            height={133}
            className={clsx(heightClass, "object-contain hidden dark:block")}
            priority={priority}
          />
        </>
      ) : (
        <>
          {/* Light Mode Icon Only */}
          <Image
            src="/logo-icon.png"
            alt="ShipSprint"
            width={425}
            height={299}
            className={clsx(heightClass, "object-contain dark:hidden")}
            priority={priority}
          />
          {/* Dark Mode Icon Only */}
          <Image
            src="/logo-icon-dark.png"
            alt="ShipSprint"
            width={425}
            height={299}
            className={clsx(heightClass, "object-contain hidden dark:block")}
            priority={priority}
          />
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center transition-opacity hover:opacity-90 active:scale-[0.99]"
      >
        {content}
      </Link>
    );
  }

  return content;
}
