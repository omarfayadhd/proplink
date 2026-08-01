import { describe, expect, it } from "vitest";
import { reorderImages } from "@/components/uploads/reorder";

describe("reorderImages", () => {
  const images = [
    { url: "/a.jpg", sortOrder: 0 },
    { url: "/b.jpg", sortOrder: 1 },
    { url: "/c.jpg", sortOrder: 2 },
  ];

  it("moves an item forward and renumbers sortOrder sequentially", () => {
    const result = reorderImages(images, 0, 2);
    expect(result.map((i) => i.url)).toEqual(["/b.jpg", "/c.jpg", "/a.jpg"]);
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it("moves an item backward and renumbers sortOrder sequentially", () => {
    const result = reorderImages(images, 2, 0);
    expect(result.map((i) => i.url)).toEqual(["/c.jpg", "/a.jpg", "/b.jpg"]);
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it("moving an item to its own index changes nothing", () => {
    const result = reorderImages(images, 1, 1);
    expect(result.map((i) => i.url)).toEqual(["/a.jpg", "/b.jpg", "/c.jpg"]);
  });

  it("does not mutate the input array", () => {
    reorderImages(images, 0, 2);
    expect(images.map((i) => i.url)).toEqual(["/a.jpg", "/b.jpg", "/c.jpg"]);
    expect(images.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it("is a no-op for out-of-range indices", () => {
    const result = reorderImages(images, -1, 1);
    expect(result.map((i) => i.url)).toEqual(["/a.jpg", "/b.jpg", "/c.jpg"]);
  });
});
