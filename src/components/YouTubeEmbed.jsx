import React from 'react';

const YouTubeEmbed = ({ videoId }) => {
  return (
    <div className="w-full max-w-3xl aspect-video">
      <iframe
        className="w-full h-full rounded-2xl shadow-lg border border-red-900/40"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
};

export default YouTubeEmbed;
