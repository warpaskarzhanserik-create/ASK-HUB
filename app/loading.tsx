import { Logo } from "@/components/Logo";

export default function Loading() {
  return (
    <div className="loading" aria-label="Загрузка">
      <Logo variant="star" size={44} />
    </div>
  );
}
