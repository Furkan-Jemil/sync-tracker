import React from "react";
import Image from "next/image";

export type ProfileNodeProps = {
  id: string;
  name: string;
  role: string;
  status: "IN_SYNC" | "BLOCKED" | "NEEDS_UPDATE";
  avatarUrl?: string;
};

/**
 * Circular profile node displaying avatar (or initials), name, role badge, and a status aura.
 * Uses Tailwind CSS for styling and lightweight CSS keyframe animations.
 */
const ProfileNode: React.FC<ProfileNodeProps> = ({ name, role, status, avatarUrl }) => {
  // Compute initials fallback
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // Tailwind classes for role badge colors
  const roleColors: Record<string, string> = {
    Owner: "bg-indigo-600",
    Contributor: "bg-green-600",
    Helper: "bg-yellow-600",
    Reviewer: "bg-purple-600",
  };

  // Status aura classes
  const auraClasses: Record<string, string> = {
    IN_SYNC: "animate-pulse opacity-30 ring-2 ring-green-400",
    BLOCKED: "animate-ping opacity-30 ring-2 ring-red-500",
    NEEDS_UPDATE: "animate-bounce opacity-30 ring-2 ring-amber-400",
  };

  return (
    <div className="relative flex flex-col items-center w-24 h-24">
      {/* Aura */}
      <div
        className={`absolute inset-0 rounded-full ${auraClasses[status]}`}
        aria-label={`status-${status}`}
      />
      {/* Avatar */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={64}
          height={64}
          className="rounded-full border-2 border-white shadow-lg"
        />
      ) : (
        <div className="flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full text-xl font-medium text-gray-700">
          {initials}
        </div>
      )}
      {/* Name */}
      <span className="mt-1 text-sm font-semibold text-white truncate max-w-full" title={name}>
        {name}
      </span>
      {/* Role badge */}
      <span
        className={`mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full text-white ${roleColors[role]}`}
        title={role}
      >
        {role}
      </span>
    </div>
  );
};

export default React.memo(ProfileNode);
