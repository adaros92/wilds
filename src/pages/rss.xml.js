import rss from "@astrojs/rss";
import photos from "../data/photos.json";

export function GET(context) {
  const sorted = [...photos].sort((a, b) => Number(b.id) - Number(a.id));

  return rss({
    title: "Adams Rosales — Photography",
    description: "Photography by Adams Rosales",
    site: context.site,
    items: sorted.map((photo) => ({
      title: photo.title,
      description: photo.alt,
      link: `/photos/${photo.id}/`,
      enclosure: {
        url: photo.src,
        length: 0,
        type: "image/avif",
      },
    })),
  });
}
