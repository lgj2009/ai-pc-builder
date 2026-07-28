"use client";

import { useState } from "react";
import {
  Search,
  User,
  Menu,
  X,
  Star,
  Clock,
  Calendar,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Movies", delay: 100 },
  { label: "TV Series", delay: 150 },
  { label: "Editor's Pick", delay: 200 },
  { label: "Interviews", delay: 250 },
  { label: "User Reviews", delay: 300 },
];

export default function CinematicPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ====== Background Video ====== */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* ====== Bottom Blur Overlay ====== */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          maskImage:
            "linear-gradient(to top, black 0%, transparent 45%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 0%, transparent 45%)",
        }}
      />

      {/* ====== Navbar ====== */}
      <nav className="relative z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 md:py-6">
        {/* Logo */}
        <h1
          className="animate-blur-fade-up h-8 md:h-10 text-xl md:text-2xl font-bold text-white flex items-center"
          style={{ animationDelay: "0ms" }}
        >
          CINEMATIC
        </h1>

        {/* Center nav links (desktop) */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href="#"
              className="animate-blur-fade-up text-sm text-gray-300 hover:text-white transition-colors"
              style={{ animationDelay: `${link.delay}ms` }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search button (sm+) */}
          <button
            className="animate-blur-fade-up hidden sm:flex items-center gap-2 rounded-full liquid-glass px-4 md:px-6 py-2 text-white text-sm"
            style={{ animationDelay: "350ms" }}
          >
            <Search size={18} />
            <span>Search</span>
          </button>

          {/* User button (sm+) */}
          <button
            className="animate-blur-fade-up hidden sm:flex items-center justify-center w-10 h-10 rounded-full liquid-glass text-white"
            style={{ animationDelay: "400ms" }}
          >
            <User size={18} />
          </button>

          {/* Hamburger (below lg) */}
          <button
            className="animate-blur-fade-up flex lg:hidden items-center justify-center w-10 h-10 rounded-full liquid-glass text-white"
            style={{ animationDelay: "350ms" }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div
              className="relative w-[18px] h-[18px] transition-all duration-500 ease-out"
              style={{
                transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <Menu
                size={18}
                className="absolute inset-0 transition-all duration-500 ease-out"
                style={{
                  opacity: menuOpen ? 0 : 1,
                  transform: menuOpen ? "scale(0.5)" : "scale(1)",
                }}
              />
              <X
                size={18}
                className="absolute inset-0 transition-all duration-500 ease-out"
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "scale(1)" : "scale(0.5)",
                }}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* ====== Mobile Menu ====== */}
      <div
        className={`absolute top-[72px] left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-t border-b border-gray-800 shadow-2xl transition-all duration-500 ease-out ${
          menuOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-4 opacity-0 pointer-events-none"
        } lg:hidden`}
      >
        <div className="flex flex-col p-4 gap-1">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.label}
              href="#"
              className="py-3 px-3 rounded-lg text-white text-sm hover:bg-gray-800/50 transition-colors"
              style={{
                animationDelay: menuOpen ? `${i * 50}ms` : "0ms",
                transition: "all 0.5s ease-out",
                transform: menuOpen
                  ? "translateX(0)"
                  : `translateX(${(i + 1) * 10}px)`,
                opacity: menuOpen ? 1 : 0,
              }}
            >
              {link.label}
            </a>
          ))}
          {/* Below sm: search + profile */}
          <div className="sm:hidden border-t border-gray-800 mt-3 pt-3 flex flex-col gap-3">
            <button className="flex items-center gap-2 rounded-full liquid-glass px-4 py-2 text-white text-sm">
              <Search size={18} />
              <span>Search</span>
            </button>
            <button className="flex items-center gap-2 rounded-full liquid-glass px-4 py-2 text-white text-sm">
              <User size={18} />
              <span>Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====== Hero Content ====== */}
      <div className="relative z-10 flex flex-col justify-end h-[calc(100vh-72px)] md:h-[calc(100vh-88px)] px-4 sm:px-6 md:px-12 pb-8 md:pb-16">
        <div className="flex flex-col md:flex-row items-end gap-8">
          {/* Left side */}
          <div className="flex-1">
            {/* Metadata row */}
            <div
              className="animate-blur-fade-up flex flex-wrap items-center gap-3 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm text-gray-300"
              style={{ animationDelay: "300ms" }}
            >
              <span className="flex items-center gap-1.5">
                <Star size={16} className="fill-white text-white sm:w-5 sm:h-5" />
                <span className="font-medium">8.7/10 IMDB</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={16} />
                <span>132 min</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={16} />
                <span>April, 2025</span>
              </span>
            </div>

            {/* Title */}
            <h2
              className="animate-blur-fade-up text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white mb-4 md:mb-6"
              style={{
                animationDelay: "400ms",
                letterSpacing: "-0.04em",
              }}
            >
              Step Through.
              <br />
              Work Smarter.
            </h2>

            {/* Description */}
            <p
              className="animate-blur-fade-up text-base sm:text-lg md:text-xl text-gray-400 mb-6 md:mb-12 max-w-2xl"
              style={{ animationDelay: "500ms" }}
            >
              A voyage through forgotten realms, where past and future
              intertwine.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                className="animate-blur-fade-up flex items-center gap-2 bg-white text-black rounded-full font-medium px-6 sm:px-8 py-2.5 sm:py-3 hover:bg-gray-200 transition-colors"
                style={{ animationDelay: "600ms" }}
              >
                <Play size={18} className="fill-black" />
                <span>Watch Now</span>
              </button>
              <button
                className="animate-blur-fade-up rounded-full font-medium liquid-glass text-white px-6 sm:px-8 py-2.5 sm:py-3"
                style={{ animationDelay: "700ms" }}
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right side: nav arrows */}
          <div className="flex md:flex-col gap-3 shrink-0">
            <button
              className="animate-blur-fade-up rounded-full liquid-glass text-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2"
              style={{ animationDelay: "800ms" }}
            >
              <ChevronLeft size={20} />
              <span className="text-sm">Previous</span>
            </button>
            <button
              className="animate-blur-fade-up rounded-full liquid-glass text-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2"
              style={{ animationDelay: "900ms" }}
            >
              <span className="text-sm">Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
