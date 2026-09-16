import { useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { Eraser } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const { language } = useLanguage();

  function getCtx() {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d") ?? null;
  }

  function pointerPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handleMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#16202B";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (empty) setEmpty(false);
  }

  function handleUp() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && !empty) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        className="w-full touch-none rounded-md border border-ink-200 bg-white"
        style={{ height: 140 }}
      />
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-ink-400">{language === "ar" ? "وقّع هنا بإصبعك أو الماوس" : "Sign here with your finger or mouse"}</p>
        <button type="button" onClick={clear} className="flex items-center gap-1 text-xs text-ink-400 hover:text-clay-500">
          <Eraser className="h-3.5 w-3.5" />
          {language === "ar" ? "مسح" : "Clear"}
        </button>
      </div>
    </div>
  );
}
