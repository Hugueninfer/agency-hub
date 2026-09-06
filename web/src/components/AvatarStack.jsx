const COLORS = ["bg-violet-400", "bg-amber-400", "bg-emerald-400", "bg-rose-400", "bg-sky-400"];

export default function AvatarStack({ names, size = 32 }) {
  return (
    <div className="flex -space-x-2">
      {names.map((name, i) => (
        <div
          key={i}
          style={{ width: size, height: size }}
          className={`rounded-full border-2 border-white dark:border-dm-card flex items-center justify-center text-[10px] font-semibold text-white ${COLORS[i % COLORS.length]}`}
          title={name}
        >
          {name.charAt(0)}
        </div>
      ))}
    </div>
  );
}
