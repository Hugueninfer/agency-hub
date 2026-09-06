/**
 * Lightweight class concat helper.
 * Usage: cx("foo", condition && "bar", "baz")
 */
export function cx(...args) {
  return args.filter(Boolean).join(" ");
}

/**
 * dm-mode overrides for shared recipe classes.
 * Apply these alongside the base class in JSX.
 */
export const dark = {
  card: "dark:bg-dm-card dark:border dark:border-dm-border dark:shadow-card-dark dark:hover:shadow-card-dm-hover",
  chip: "dark:bg-dm-card dark:border-dm-border dark:text-dm-txt-secondary",
  btnPrimary: "dark:bg-dm-accent-lime dark:text-dm-bg dark:hover:opacity-90",
  btnSecondary: "dark:border-dm-border dark:bg-dm-card dark:text-dm-txt-primary dark:hover:bg-dm-card-hover",
  iconBtn: "dark:border-dm-border dark:bg-dm-card dark:text-dm-txt-secondary dark:hover:bg-dm-card-hover",
};
