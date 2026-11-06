// The opening catalogue. Photos: Unsplash (Unsplash License). 3D models: Khronos glTF Sample Assets (CC-BY 4.0),
// credited on each product. Everything here can be edited or removed from the admin dashboard.

export const categories = [
  ["t-shirts", "T-shirts", "fashion", "Heavy cotton jersey, cut to sit right.", "essential-tee-2"],
  ["shirts", "Shirts", "fashion", "Poplin, chambray and denim, pressed and ready.", "poplin-shirt"],
  ["pants", "Pants", "fashion", "Relaxed tailoring and workwear trousers.", "rose-pant"],
  ["jeans", "Jeans", "fashion", "Rigid and stretch denim in straight and slim fits.", "rip-straight-jean"],
  ["jackets", "Jackets", "fashion", "Leather, denim, bombers and blazers.", "moto-leather-jacket"],
  ["hoodies", "Hoodies", "fashion", "Loopback fleece in quiet colours.", "fog-hoodie"],
  ["shorts", "Shorts", "fashion", "For the coast and the city.", "frayed-denim-short"],
  ["dresses", "Dresses", "fashion", "From day wrap dresses to evening gowns.", "carmim-dress"],
  ["outfits", "Complete outfits", "fashion", "Head-to-toe looks, styled and sold together.", "heritage-suit"],
  ["watches", "Watches", "accessories", "Chronographs and minimalist dials.", "chrono-watch-1"],
  ["sunglasses", "Sunglasses", "accessories", "Polarised lenses in metal and acetate frames.", "aurora-sunglasses"],
  ["belts", "Belts", "accessories", "Vegetable-tanned leather with solid buckles.", "cognac-belt"],
  ["bags", "Bags", "accessories", "Daypacks, satchels and top handles.", "rouge-handbag"],
  ["jewelry", "Jewelry", "accessories", "Pearls, pendants and sculpted gold.", "sculpt-earrings"],
  ["other-accessories", "Other accessories", "accessories", "Caps and the small things that finish a look.", "canvas-cap"],
  ["sneakers", "Sneakers", "footwear", "Knit runners and statement trainers.", "velocity-midnight-1"],
  ["casual-shoes", "Casual shoes", "footwear", "Espadrilles and easy slip-ons.", "riviera-espadrille"],
  ["formal-shoes", "Formal shoes", "footwear", "Oxfords, monk straps and pumps.", "double-monk"],
  ["boots", "Boots", "footwear", "Lace-up leather boots with grip.", "trail-boot"],
  ["sandals", "Sandals", "footwear", "Cork footbeds and soft straps.", "cork-sandal"],
];

const APPAREL = ["XS", "S", "M", "L", "XL"];
const WAIST = ["36", "38", "40", "42", "44", "46"];
const SHOES = ["37", "38", "39", "40", "41", "42", "43", "44"];
const ONE = ["One size"];

const SNEAKER_CREDIT = "3D model: “Materials Variants Shoe” by Shopify, CC BY 4.0 (Khronos glTF Sample Assets).";
const WATCH_CREDIT = "3D model: “Chronograph Watch” by Eric Chadwick / DGG, CC BY 4.0 (Khronos glTF Sample Assets).";
const GLASSES_CREDIT = "3D model: “Sunglasses Khronos” by Eric Chadwick / DGG, CC BY 4.0 (Khronos glTF Sample Assets).";

// [slug, name, category, price BRL, sale BRL|null, gender, images, sizes, colours [[name, hex]], options]
export const products = [
  ["essential-tee", "Essential tee", "t-shirts", 149, null, "unisex", ["essential-tee", "essential-tee-2"], APPAREL, [["Chalk white", "#f2f2ee"]],
    { featured: true, slot: "top", tryon: "tops", palette: "neutral", desc: "A 220 g/m² combed-cotton tee with a close neckline and a straight, slightly boxy body. Washed once before sewing so it keeps its shape.", details: "100% combed cotton · 220 g/m²\nRegular fit, dropped shoulder\nMachine wash cold, dry flat" }],
  ["crest-tee", "Crest tee", "t-shirts", 169, null, "unisex", ["crest-tee"], APPAREL, [["Onyx", "#151515"]],
    { slot: "top", tryon: "tops", palette: "dark", isNew: true, desc: "Black heavyweight jersey with a small chest crest printed in water-based ink.", details: "100% cotton · 240 g/m²\nRelaxed fit\nPrint: water-based, soft hand" }],
  ["coast-tee", "Coast tee", "t-shirts", 179, 139, "men", ["coast-tee"], APPAREL, [["Salt white", "#ecebe6"]],
    { slot: "top", tryon: "tops", palette: "neutral", desc: "A soft white tee with a hand-drawn coastline printed across the back.", details: "100% cotton · 200 g/m²\nRegular fit\nBack print" }],
  ["atelier-tee", "Atelier tee", "t-shirts", 159, null, "unisex", ["atelier-tee"], APPAREL, [["Ivory", "#f4f1ea"]],
    { slot: "top", tryon: "tops", palette: "neutral", desc: "Our lightest tee, in a fine 160 g/m² jersey that drapes rather than holds.", details: "100% Pima cotton · 160 g/m²\nSlim fit" }],

  ["indigo-dot-shirt", "Indigo dot shirt", "shirts", 289, null, "men", ["indigo-dot-shirt"], APPAREL, [["Indigo", "#3d5878"]],
    { slot: "top", tryon: "tops", palette: "blue", isNew: true, desc: "Chambray with a tiny printed dot, finished with mother-of-pearl buttons and a soft collar.", details: "100% cotton chambray\nRegular fit, button-down collar" }],
  ["poplin-shirt", "Poplin shirt", "shirts", 259, 219, "men", ["poplin-shirt"], APPAREL, [["Plum", "#5a2742"]],
    { slot: "top", tryon: "tops", palette: "warm", desc: "Crisp two-ply poplin in a deep plum, with a cutaway collar for wearing open or with a tie.", details: "100% cotton poplin, two-ply\nTailored fit" }],

  ["rose-pant", "Rosa cargo pant", "pants", 249, null, "women", ["rose-pant"], APPAREL, [["Dusty rose", "#d9aaa0"]],
    { slot: "bottom", tryon: "bottoms", palette: "warm", desc: "High-rise cargo trousers in a fluid twill with an elastic cuff.", details: "Viscose blend twill\nHigh rise, tapered leg" }],
  ["indigo-work-pant", "Indigo work pant", "pants", 279, null, "men", ["indigo-work-pant"], WAIST, [["Raw indigo", "#1f2a3a"]],
    { slot: "bottom", tryon: "bottoms", palette: "blue", desc: "Straight-leg work trousers in rinsed indigo denim with reinforced knees.", details: "100% cotton denim, 13 oz\nStraight leg" }],

  ["rip-straight-jean", "Ripped straight jean", "jeans", 329, null, "men", ["rip-straight-jean"], WAIST, [["Light wash", "#9fb6cc"]],
    { featured: true, slot: "bottom", tryon: "bottoms", palette: "blue", desc: "A light-wash straight jean with hand-finished abrasions at the knee.", details: "99% cotton, 1% elastane\nStraight leg, mid rise" }],
  ["classic-slim-jean", "Classic slim jean", "jeans", 299, null, "men", ["classic-slim-jean"], WAIST, [["Mid blue", "#5f7fa3"]],
    { slot: "bottom", tryon: "bottoms", palette: "blue", desc: "Our everyday slim jean with just enough stretch for a full day out.", details: "98% cotton, 2% elastane\nSlim fit" }],

  ["moto-leather-jacket", "Moto leather jacket", "jackets", 1290, 1090, "unisex", ["moto-leather-jacket"], APPAREL, [["Black", "#0d0d0d"]],
    { featured: true, slot: "outerwear", tryon: "tops", palette: "dark", desc: "Full-grain lambskin with an asymmetric zip, quilted shoulders and a satin lining.", details: "Lambskin leather, satin lining\nRegular fit\nSpecialist leather clean only" }],
  ["rust-bomber", "Rust bomber", "jackets", 549, null, "unisex", ["rust-bomber"], APPAREL, [["Rust", "#b8653f"]],
    { slot: "outerwear", tryon: "tops", palette: "warm", isNew: true, desc: "A lightweight nylon bomber in rust, with rib trims and a two-way zip.", details: "100% recycled nylon shell\nRegular fit" }],
  ["cord-denim-jacket", "Cord-collar denim jacket", "jackets", 459, null, "men", ["cord-denim-jacket"], APPAREL, [["Dark indigo", "#26344d"]],
    { slot: "outerwear", tryon: "tops", palette: "blue", desc: "Rigid indigo denim with a tan corduroy collar and copper shanks.", details: "100% cotton denim, 14 oz\nBoxy fit" }],
  ["noir-blazer", "Noir tailored blazer", "jackets", 899, null, "men", ["noir-blazer"], APPAREL, [["Black", "#111111"]],
    { featured: true, slot: "outerwear", tryon: "tops", palette: "dark", desc: "A single-breasted wool-blend blazer with a soft shoulder and peak lapels.", details: "70% wool, 30% polyester\nHalf-canvas construction" }],
  ["bleach-denim-jacket", "Bleached denim jacket", "jackets", 399, 329, "women", ["bleach-denim-jacket"], APPAREL, [["Bleach blue", "#a8bdd3"]],
    { slot: "outerwear", tryon: "tops", palette: "blue", desc: "A cropped trucker jacket washed down to a pale summer blue.", details: "100% cotton denim\nCropped fit" }],

  ["fog-hoodie", "Fog hoodie", "hoodies", 349, null, "unisex", ["fog-hoodie"], APPAREL, [["Fog grey", "#9ea3a6"]],
    { featured: true, slot: "top", tryon: "tops", palette: "neutral", desc: "Brushed loopback fleece with a double-layer hood and a kangaroo pocket.", details: "80% cotton, 20% polyester · 400 g/m²\nRelaxed fit" }],
  ["sol-tracksuit", "Sol tracksuit set", "hoodies", 499, null, "women", ["sol-tracksuit"], APPAREL, [["Sun yellow", "#e9b62f"]],
    { slot: "one-piece", tryon: "one-pieces", palette: "warm", isNew: true, desc: "A cropped hoodie and jogger set in a saturated sun yellow.", details: "Cotton fleece\nSold as a set" }],
  ["cloud-crewneck", "Cloud crewneck", "hoodies", 299, null, "unisex", ["cloud-crewneck"], APPAREL, [["Cloud white", "#f5f5f3"]],
    { slot: "top", tryon: "tops", palette: "neutral", desc: "A clean white crewneck sweatshirt in heavyweight French terry.", details: "100% cotton French terry\nRegular fit" }],

  ["frayed-denim-short", "Frayed denim short", "shorts", 199, null, "women", ["frayed-denim-short"], WAIST, [["Bleach blue", "#b8cadb"]],
    { slot: "bottom", tryon: "bottoms", palette: "blue", desc: "High-rise denim shorts with a rolled, frayed hem.", details: "100% cotton denim\nHigh rise" }],

  ["carmim-dress", "Carmim dress", "dresses", 489, null, "women", ["carmim-dress"], APPAREL, [["Carmine", "#c0262d"]],
    { featured: true, slot: "one-piece", tryon: "one-pieces", palette: "warm", desc: "A fit-and-flare cotton dress in carmine with a small floral print and a self-tie belt.", details: "100% cotton\nFitted waist, full skirt" }],
  ["scarlet-gown", "Scarlet gown", "dresses", 1190, null, "women", ["scarlet-gown"], APPAREL, [["Scarlet", "#c8102e"]],
    { slot: "one-piece", tryon: "one-pieces", palette: "warm", desc: "A floor-length chiffon gown that moves with every step, with a fitted bodice.", details: "Silk-feel chiffon, fully lined\nFloor length" }],
  ["jardim-wrap-dress", "Jardim wrap dress", "dresses", 429, 359, "women", ["jardim-wrap-dress"], APPAREL, [["Floral ivory", "#ece5da"]],
    { slot: "one-piece", tryon: "one-pieces", palette: "neutral", desc: "A lightweight floral wrap dress made for long lunches by the sea.", details: "100% viscose\nWrap front, midi length" }],
  ["knit-sheath-dress", "Knit sheath dress", "dresses", 389, null, "women", ["knit-sheath-dress"], APPAREL, [["Heather grey", "#b9bcbf"]],
    { slot: "one-piece", tryon: "one-pieces", palette: "neutral", desc: "A rib-knit sheath that skims the body, with short sleeves and a crew neck.", details: "Viscose blend rib knit\nKnee length" }],
  ["rubi-slit-dress", "Rubi slit dress", "dresses", 690, null, "women", ["rubi-slit-dress"], APPAREL, [["Ruby", "#a3121f"]],
    { isNew: true, slot: "one-piece", tryon: "one-pieces", palette: "warm", desc: "An evening dress with a high slit and a long train in ruby crepe.", details: "Crepe, fully lined\nAsymmetric hem" }],

  ["heritage-suit", "Heritage navy suit", "outfits", 1890, null, "men", ["heritage-suit"], APPAREL, [["Navy", "#1c2a4a"]],
    { featured: true, palette: "blue", desc: "Jacket and trousers in a navy wool, styled with a white shirt and brown leather shoes. The suit is sold as two pieces; shirt and shoes are sold separately.", details: "Super 110s wool\nTwo-piece suit" }],
  ["midnight-suit", "Midnight suit", "outfits", 1690, 1490, "men", ["midnight-suit"], APPAREL, [["Midnight", "#141a2a"]],
    { palette: "dark", desc: "A midnight two-piece suit with a narrow lapel for evening.", details: "Wool blend\nTwo-piece suit" }],
  ["weekend-set", "Weekend set", "outfits", 1490, null, "men", ["weekend-set"], APPAREL, [["Indigo & sand", "#5d6a7d"]],
    { palette: "neutral", desc: "A complete look: slim jeans, a white shirt with a knit tie, a sand linen blazer and brown brogues.", details: "Four pieces, sizes chosen per piece at checkout notes" }],
  ["camel-layer-look", "Camel layer look", "outfits", 1290, null, "men", ["camel-layer-look"], APPAREL, [["Camel", "#b07b4f"]],
    { palette: "warm", desc: "Camel overcoat, white tee and light trousers with white leather trainers.", details: "Three pieces" }],

  ["chrono-watch", "Chronograph field watch", "watches", 1890, null, "unisex", ["chrono-watch-1", "chrono-watch-2", "chrono-watch-3"], ONE, [["Gold & black", "#c7a755"]],
    { featured: true, isNew: true, slot: "watch", palette: "dark", model: "/models/chrono-watch.glb", sequence: "chrono-watch", credit: WATCH_CREDIT,
      desc: "A shock-resistant chronograph with a sculpted gold-tone case, analogue-digital display and a textured strap.", details: "Gold-tone case, resin strap\nWater resistant to 200 m\nAnalogue + digital display" }],
  ["meridian-watch", "Meridian leather watch", "watches", 890, null, "unisex", ["meridian-watch"], ONE, [["Tan & white", "#a77a52"]],
    { slot: "watch", palette: "warm", desc: "A clean white dial on a slim case with a tan calfskin strap.", details: "38 mm steel case\nItalian calfskin strap" }],
  ["halo-watch", "Halo minimalist watch", "watches", 690, 590, "unisex", ["halo-watch"], ONE, [["White", "#f0f0f0"]],
    { slot: "watch", palette: "neutral", desc: "An all-white minimalist watch with a black dial and a silicone strap.", details: "40 mm case\nSilicone strap" }],

  ["aurora-sunglasses", "Aurora round sunglasses", "sunglasses", 459, null, "unisex", ["aurora-sunglasses"], ONE, [["Gold & green", "#2f4a3c"]],
    { featured: true, slot: "eyewear", palette: "neutral", desc: "Thin gold-tone round frames with polarised bottle-green lenses.", details: "Metal frame\nPolarised lenses, UV400" }],
  ["lumen-sunglasses", "Lumen aviator sunglasses", "sunglasses", 529, null, "unisex", ["lumen-sunglasses-1", "lumen-sunglasses-2", "lumen-sunglasses-3"], ONE, [["Silver & blue mirror", "#3f6ea6"]],
    { isNew: true, slot: "eyewear", palette: "blue", model: "/models/lumen-sunglasses.glb", credit: GLASSES_CREDIT,
      desc: "Silver aviators with blue mirrored lenses and black acetate temple tips.", details: "Metal frame\nMirrored lenses, UV400" }],

  ["cognac-belt", "Cognac leather belt", "belts", 229, null, "unisex", ["cognac-belt"], ["85", "90", "95", "100", "105"], [["Cognac", "#8a4b2a"]],
    { slot: "accessory", palette: "warm", desc: "A 35 mm vegetable-tanned leather belt with a brushed steel buckle.", details: "Full-grain leather\n35 mm width" }],

  ["navy-daypack", "Navy daypack", "bags", 389, null, "unisex", ["navy-daypack"], ONE, [["Navy", "#1d2944"]],
    { slot: "accessory", palette: "blue", desc: "A water-resistant daypack with a padded laptop sleeve.", details: "Recycled polyester\nFits a 15\" laptop" }],
  ["rouge-handbag", "Rouge top-handle bag", "bags", 1290, null, "women", ["rouge-handbag"], ONE, [["Rouge", "#c43a2a"]],
    { featured: true, slot: "accessory", palette: "warm", desc: "Structured calfskin with a silver clasp and a detachable strap.", details: "Smooth calfskin\nDetachable shoulder strap" }],
  ["pearl-satchel", "Pearl grey satchel", "bags", 790, 690, "women", ["pearl-satchel"], ONE, [["Pearl grey", "#c9c9c7"]],
    { slot: "accessory", palette: "neutral", desc: "A compact satchel with gold-tone hardware.", details: "Pebbled leather" }],

  ["perola-necklace", "Pérola necklace", "jewelry", 690, null, "women", ["perola-necklace"], ONE, [["Pearl", "#efe9df"]],
    { slot: "accessory", palette: "neutral", desc: "A single strand of freshwater pearls with a gold-plated clasp.", details: "Freshwater pearls, 45 cm" }],
  ["crescent-pendant", "Crescent pendant", "jewelry", 349, null, "women", ["crescent-pendant"], ONE, [["Gold", "#c7a25a"]],
    { slot: "accessory", palette: "warm", desc: "Layered chains with a crescent moon and a faceted stone.", details: "Gold-plated brass" }],
  ["sculpt-earrings", "Sculpt earrings", "jewelry", 429, null, "women", ["sculpt-earrings"], ONE, [["Gold", "#c9a24e"]],
    { isNew: true, slot: "accessory", palette: "warm", desc: "Molten gold-plated hoops with an organic, hand-finished surface.", details: "18k gold-plated brass" }],
  ["drop-necklace", "Drop necklace", "jewelry", 289, null, "women", ["drop-necklace"], ONE, [["Gold", "#d1b06a"]],
    { slot: "accessory", palette: "neutral", desc: "A fine chain with a single pearl drop.", details: "Gold-plated silver, 42 cm" }],

  ["canvas-cap", "Canvas cap", "other-accessories", 149, null, "unisex", ["canvas-cap"], ONE, [["White", "#f3f3f1"]],
    { slot: "accessory", palette: "neutral", desc: "A six-panel cotton canvas cap with an adjustable strap.", details: "100% cotton canvas" }],

  ["velocity-sneaker", "Velocity knit sneaker", "sneakers", 799, null, "unisex", ["velocity-midnight-1", "velocity-midnight-2", "velocity-beach-1", "velocity-beach-2", "velocity-street-1", "velocity-street-2"], SHOES,
    [["Midnight blue", "#1f7fb8"], ["Beach rose", "#d6a7a8"], ["Street black", "#141414"]],
    { featured: true, isNew: true, slot: "shoes", palette: "blue", model: "/models/velocity-sneaker.glb", sequence: "velocity-sneaker", credit: SNEAKER_CREDIT,
      variants3d: { "Midnight blue": "midnight", "Beach rose": "beach", "Street black": "street" },
      imageColors: ["Midnight blue", "Midnight blue", "Beach rose", "Beach rose", "Street black", "Street black"],
      desc: "A breathable knit runner on a cushioned foam sole. Pick a colourway and the 3D model changes with it.", details: "Engineered knit upper\nEVA foam midsole\nRemovable insole" }],
  ["prism-runner", "Prism runner", "sneakers", 699, 599, "unisex", ["prism-runner"], SHOES, [["Prism", "#e8e2d8"]],
    { slot: "shoes", palette: "neutral", desc: "Chunky layered panels in bold colour blocks on an ivory base.", details: "Mesh and suede upper" }],

  ["riviera-espadrille", "Riviera espadrille", "casual-shoes", 249, null, "unisex", ["riviera-espadrille"], SHOES, [["Red", "#c8282d"]],
    { slot: "shoes", palette: "warm", desc: "Canvas espadrilles on a braided jute sole, made for summer.", details: "Cotton canvas, jute sole" }],

  ["double-monk", "Double monk strap", "formal-shoes", 790, null, "men", ["double-monk"], SHOES, [["Brown", "#5c3b25"]],
    { slot: "shoes", palette: "warm", desc: "Burnished calf leather with two buckled straps on a Goodyear-welted sole.", details: "Calf leather\nGoodyear welt" }],
  ["oxford-cognac", "Cognac oxford", "formal-shoes", 690, null, "men", ["oxford-cognac"], SHOES, [["Cognac", "#8f4d26"]],
    { slot: "shoes", palette: "warm", desc: "A sleek cap-toe oxford in hand-polished cognac leather.", details: "Calf leather\nLeather sole" }],
  ["floral-pump", "Floral pump", "formal-shoes", 590, null, "women", ["floral-pump"], ["34", "35", "36", "37", "38", "39"], [["Blue floral", "#2e5fa8"]],
    { slot: "shoes", palette: "blue", desc: "A pointed stiletto pump in printed satin.", details: "Satin upper, 10 cm heel" }],

  ["trail-boot", "Trail lace boot", "boots", 790, null, "men", ["trail-boot"], SHOES, [["Tobacco", "#7a4a26"]],
    { slot: "shoes", palette: "warm", desc: "Waxed leather lace-up boots with a lugged rubber sole.", details: "Waxed leather\nRubber lug sole" }],
  ["obsidian-boot", "Obsidian boot", "boots", 849, null, "men", ["obsidian-boot"], SHOES, [["Dark brown", "#3a2a22"]],
    { slot: "shoes", palette: "dark", desc: "A dark brown leather boot with a clean toe and a stacked heel.", details: "Leather upper, rubber sole" }],

  ["cork-sandal", "Cork sandal", "sandals", 299, null, "unisex", ["cork-sandal"], SHOES, [["Stone", "#c8c2b6"]],
    { slot: "shoes", palette: "neutral", desc: "Two-strap sandals on a contoured cork footbed.", details: "Suede straps, cork footbed" }],
];

export const shippingRates = [
  ["SE", "Southeast", 1990, 4, 3490, 2, 39900],
  ["S", "South", 2490, 5, 4290, 2, 49900],
  ["CO", "Centre-West", 2790, 6, 4890, 3, 49900],
  ["NE", "Northeast", 3290, 8, 5990, 3, 59900],
  ["N", "North", 3990, 10, 6990, 4, 69900],
];

// Studio model photos for virtual try-on (Unsplash License).
export const tryonModels = [
  ["Rafael", "men", "regular", "front", "standing", "/catalog/essential-tee-2.jpg"],
  ["Thiago", "men", "regular", "front", "standing", "/catalog/classic-slim-jean.jpg"],
  ["Lia", "women", "slim", "front", "standing", "/catalog/knit-sheath-dress.jpg"],
  ["Nina", "women", "regular", "front", "standing", "/catalog/sol-tracksuit.jpg"],
];
