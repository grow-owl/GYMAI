import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import jsQR from "jsqr";
import { Camera, X, AlertTriangle, Keyboard } from "lucide-react";

type ScanStatus = "starting" | "scanning" | "denied" | "unsupported" | "no-camera" | "error";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  allowManualEntry?: boolean;
}

export default function QRScanner({ onScan, onClose, allowManualEntry = true }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasScannedRef = useRef(false);

  const [status, setStatus] = useState<ScanStatus>("starting");
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const stopStream = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || hasScannedRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          hasScannedRef.current = true;
          stopStream();
          onScan(code.data);
          return;
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onScan, stopStream]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("scanning");
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;

        const name = (err as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setStatus("no-camera");
        else setStatus("error");
      }
    }

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream, tick]);

  function handleManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;

    hasScannedRef.current = true;
    stopStream();
    onScan(trimmed);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover ${status === "scanning" ? "opacity-100" : "opacity-0"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {status === "scanning" && (
          <>
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70">
              <span className="absolute -top-0.5 -left-0.5 h-6 w-6 border-t-4 border-l-4 border-(--color-accent) rounded-tl-xl" />
              <span className="absolute -top-0.5 -right-0.5 h-6 w-6 border-t-4 border-r-4 border-(--color-accent) rounded-tr-xl" />
              <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-4 border-l-4 border-(--color-accent) rounded-bl-xl" />
              <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-4 border-r-4 border-(--color-accent) rounded-br-xl" />
            </div>
            <div className="absolute left-1/2 top-8 h-0.5 w-[calc(100%-4rem)] -translate-x-1/2 bg-(--color-accent)/80 scan-line-anim" />
          </>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <Camera size={28} className="animate-pulse" />
            <p className="text-xs">Opening camera…</p>
          </div>
        )}

        {(status === "denied" || status === "unsupported" || status === "no-camera" || status === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/90">
            <AlertTriangle size={24} className="text-(--color-warn)" />
            <p className="text-xs leading-relaxed">
              {status === "denied" &&
                "Camera access was denied. Please allow camera permission in your browser settings and try again."}
              {status === "unsupported" && "Camera scanning isn't supported on this device or browser."}
              {status === "no-camera" && "No camera was found on this device."}
              {status === "error" && "Couldn't start the camera. Please try again."}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-(--color-text-faint) mt-4 text-center max-w-xs">
        {status === "scanning"
          ? "Position the gym's check-in QR code inside the frame"
          : "You can also enter the check-in code shown at the gym manually."}
      </p>

      {allowManualEntry && !manualMode && (
        <button
          onClick={() => setManualMode(true)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-(--color-accent-text)"
        >
          <Keyboard size={13} /> Enter code manually
        </button>
      )}

      {manualMode && (
        <form onSubmit={handleManualSubmit} className="mt-3 w-full max-w-sm flex gap-2">
          <input
            autoFocus
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Check-in code"
            className="flex-1 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          />
          <button type="submit" className="rounded-full bg-(--color-accent) text-white text-sm font-semibold px-4 py-2.5">
            Go
          </button>
        </form>
      )}

      <button
        onClick={() => {
          stopStream();
          onClose();
        }}
        className="mt-5 flex items-center gap-1.5 rounded-full border border-(--color-border) text-(--color-text-muted) text-sm font-medium px-5 py-2.5"
      >
        <X size={15} /> Cancel
      </button>
    </div>
  );
}