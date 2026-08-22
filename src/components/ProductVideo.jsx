import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Pause, Play } from 'lucide-react';

const videoSource = '/media/litepuff-product-story.mp4';
const posterSource = '/media/litepuff-product-story-poster.jpg';

export default function ProductVideo() {
  const reduceMotion = useReducedMotion();
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const manuallyPaused = useRef(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const loadObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNearViewport(true);
    }, { rootMargin: '250px 0px', threshold: 0 });

    const playbackObserver = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      setIsVisible(visible);
      const video = videoRef.current;
      if (!video || reduceMotion) return;
      if (visible && !manuallyPaused.current) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: [0, 0.35] });

    loadObserver.observe(frame);
    playbackObserver.observe(frame);
    return () => {
      loadObserver.disconnect();
      playbackObserver.disconnect();
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!nearViewport || !videoRef.current) return;
    videoRef.current.load();
  }, [nearViewport]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return;
    if (isVisible && !manuallyPaused.current) video.play().catch(() => {});
    else video.pause();
  }, [isVisible, nearViewport, reduceMotion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setNearViewport(true);
    if (video.paused) {
      manuallyPaused.current = false;
      window.requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
    } else {
      manuallyPaused.current = true;
      video.pause();
    }
  };

  return <section className="bg-white px-5 py-16 sm:px-6 md:py-20 lg:px-10 lg:py-24" aria-labelledby="product-video-title">
    <div className="mx-auto grid max-w-[1180px] items-center gap-10 md:grid-cols-[1fr_0.78fr] md:gap-14 lg:gap-20">
      <div className="text-center md:text-left">
        <p className="text-xs font-bold uppercase tracking-[.3em] text-[#A97826]">LitePuff</p>
        <h2 id="product-video-title" className="mt-4 font-display text-[42px] font-semibold leading-[.96] tracking-[-.035em] text-[#243029] sm:text-5xl lg:text-[58px]">Lighter. Smarter.<br className="hidden sm:block" /> Everyday.</h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#606862] md:mx-0">Bold flavours. Light crunch. Made for everyday snacking.</p>
        <Link to="/products" className="group mt-7 inline-flex min-h-11 items-center gap-2 border-b border-[#2F5E2A] pb-1 text-sm font-bold text-[#2F5E2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4A017]">Explore Makhana <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
      </div>

      <div ref={frameRef} className="relative mx-auto aspect-[560/752] w-full max-w-[340px] overflow-hidden rounded-[22px] border border-[#DED5C7] bg-[#FAF8F3] shadow-[0_18px_45px_rgba(36,48,41,.11)] sm:max-w-[372px]">
        <video ref={videoRef} className="h-full w-full object-contain" poster={posterSource} muted loop playsInline preload="metadata" aria-label="LitePuff product story video" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}>
          {nearViewport && <source src={videoSource} type="video/mp4" />}
          Your browser does not support HTML video. You can <a href={videoSource}>open the LitePuff product story video</a>.
        </video>
        <button type="button" onClick={togglePlayback} className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-[#FAF8F3]/95 text-[#2F5E2A] shadow-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A017]" aria-label={isPlaying ? 'Pause LitePuff product story' : 'Play LitePuff product story'}>
          {isPlaying ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}
        </button>
      </div>
    </div>
  </section>;
}
