import type { FenceCategoryId, FenceStyleId } from "@/types/models";
import { FENCE_HEIGHTS_M } from "@/config/fenceHeights";
import { fenceStyleImages } from "@/config/fenceStyleImages";

type FenceStyleData = {
  id: FenceStyleId;
  name: string;
  image: string;
  availableHeights: number[];
};

const RESIDENTIAL_STYLES: Array<Omit<FenceStyleData, "availableHeights">> = [
  { id: "bellbrae", name: "Bellbrae", image: fenceStyleImages.bellbrae },
  { id: "jabiru", name: "Jabiru", image: fenceStyleImages.jabiru },
  { id: "kestrel", name: "Kestrel", image: fenceStyleImages.kestrel },
  { id: "kookaburra", name: "Kookaburra", image: fenceStyleImages.kookaburra },
  {
    id: "mystique_lattice",
    name: "Mystique Lattice",
    image: fenceStyleImages.mystique_lattice,
  },
  {
    id: "mystique_solid",
    name: "Mystique Solid",
    image: fenceStyleImages.mystique_solid,
  },
  { id: "rosella", name: "Rosella", image: fenceStyleImages.rosella },
  { id: "toucan", name: "Toucan", image: fenceStyleImages.toucan },
  { id: "wren", name: "Wren", image: fenceStyleImages.wren },
];

const RURAL_STYLES: Array<Omit<FenceStyleData, "availableHeights">> = [
  { id: "1_rail_140x40", name: "1 Rail 140x40", image: fenceStyleImages["1_rail_140x40"] },
  { id: "1_rail_150x50", name: "1 Rail 150x50", image: fenceStyleImages["1_rail_150x50"] },
  { id: "2_rails_140x40", name: "2 Rails 140x40", image: fenceStyleImages["2_rails_140x40"] },
  { id: "2_rails_150x50", name: "2 Rails 150x50", image: fenceStyleImages["2_rails_150x50"] },
  { id: "3_rails_140x40", name: "3 Rails 140x40", image: fenceStyleImages["3_rails_140x40"] },
  { id: "3_rails_150x50", name: "3 Rails 150x50", image: fenceStyleImages["3_rails_150x50"] },
  { id: "4_rails_140x40", name: "4 Rails 140x40", image: fenceStyleImages["4_rails_140x40"] },
  { id: "4_rails_150x50", name: "4 Rails 150x50", image: fenceStyleImages["4_rails_150x50"] },
  { id: "caviar_150x50", name: "Caviar 150x50", image: fenceStyleImages.caviar_150x50 },
  { id: "crossbuck_150x50", name: "Crossbuck 150x50", image: fenceStyleImages.crossbuck_150x50 },
  { id: "mesh_150x50", name: "Mesh 150x50", image: fenceStyleImages.mesh_150x50 },
];

const DEFAULT_HEIGHTS = FENCE_HEIGHTS_M.slice();

export const getStylesByCategory = (categoryId: FenceCategoryId): FenceStyleData[] => {
  const baseStyles = categoryId === "rural" ? RURAL_STYLES : RESIDENTIAL_STYLES;
  return baseStyles.map((style) => ({
    ...style,
    availableHeights: DEFAULT_HEIGHTS,
  }));
};
