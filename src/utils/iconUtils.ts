// Utility functions for managing Google Earth icons

export interface IconCategory {
  name: string;
  path: string;
  icons: string[];
}

// Function to get all icon paths organized by category
export function getIconCategories(): IconCategory[] {
  // These paths are relative to the public folder
  const categories: IconCategory[] = [
    {
      name: "Paddle",
      path: "google_earth_icons/paddle",
      icons: [
        "1.png", "1-lv.png", "2.png", "2-lv.png", "3.png", "3-lv.png",
        "4.png", "4-lv.png", "5.png", "5-lv.png", "6.png", "6-lv.png",
        "7.png", "7-lv.png", "8.png", "8-lv.png", "9.png", "9-lv.png",
        "10.png", "10-lv.png", "A.png", "B.png",
        "C.png", "D.png", "E.png",
        "F.png", "G.png", "H.png",
        "I.png", "J.png", "K.png",
        "L.png", "M.png", "N.png",
        "O.png", "P.png", "Q.png",
        "R.png", "S.png", "T.png",
        "U.png", "V.png", "W.png",
        "X.png", "Y.png", "Z.png",
        "blu-blank.png", "blu-blank-lv.png", "blu-circle.png", "blu-circle-lv.png",
        "blu-diamond.png", "blu-diamond-lv.png", "blu-square.png", "blu-square-lv.png",
        "blu-stars.png", "blu-stars-lv.png", "go.png", "go-lv.png", "grn-blank.png", "grn-blank-lv.png",
        "grn-circle.png", "grn-circle-lv.png", "grn-diamond.png", "grn-diamond-lv.png",
        "grn-square.png", "grn-square-lv.png", "grn-stars.png", "grn-stars-lv.png",
        "ltblu-blank.png", "ltblu-circle.png",
        "ltblu-diamond.png", "ltblu-square.png",
        "ltblu-stars.png", "orange-blank.png",
        "orange-circle.png", "orange-diamond.png",
        "orange-square.png", "orange-stars.png",
        "pink-blank.png", "pink-circle.png",
        "pink-diamond.png", "pink-square.png",
        "pink-stars.png", "purple-blank.png",
        "purple-circle.png", "purple-circle-lv.png", "purple-diamond.png", "purple-diamond-lv.png",
        "purple-square.png", "purple-square-lv.png", "purple-stars.png", "purple-stars-lv.png",
        "red-circle.png", "red-circle-lv.png",
        "red-diamond.png", "red-diamond-lv.png", "red-square.png", "red-square-lv.png",
        "red-stars.png", "red-stars-lv.png", "wht-blank.png", "wht-blank-lv.png",
        "wht-circle.png", "wht-circle-lv.png", "wht-diamond.png", "wht-diamond-lv.png",
        "wht-square.png", "wht-square-lv.png", "wht-stars.png", "wht-stars-lv.png",
        "ylw-blank.png", "ylw-blank-lv.png", "ylw-circle.png", "ylw-circle-lv.png",
        "ylw-diamond.png", "ylw-diamond-lv.png", "ylw-square.png", "ylw-square-lv.png",
        "ylw-stars.png", "ylw-stars-lv.png", "pause.png", "pause-lv.png", "route.png"
      ]
    },
    {
      name: "Pushpin",
      path: "google_earth_icons/pushpin",
      icons: [
        "blue-pushpin.png", "grn-pushpin.png", "ltblu-pushpin.png",
        "pink-pushpin.png", "purple-pushpin.png", "red-pushpin.png",
        "wht-pushpin.png", "ylw-pushpin.png"
      ]
    },
    {
      name: "Shapes",
      path: "google_earth_icons/shapes",
      icons: [
        "airports.png", "arrow.png", "arrow-reverse.png", "arts.png", "bars.png",
        "broken_link.png", "bus.png", "cabs.png", "camera.png", "campfire.png",
        "campground.png", "capital_big.png", "capital_big_highlight.png",
        "capital_small.png", "capital_small_highlight.png", "caution.png",
        "church.png", "coffee.png", "convenience.png", "cross-hairs.png",
        "cross-hairs_highlight.png", "cycling.png", "dining.png", "dollar.png",
        "donut.png", "earthquake.png", "electronics.png", "euro.png",
        "falling_rocks.png", "ferry.png", "firedept.png", "fishing.png",
        "flag.png", "forbidden.png", "gas_stations.png", "golf.png",
        "grocery.png", "heliport.png", "highway.png", "hiker.png",
        "homegardenbusiness.png", "horsebackriding.png", "hospitals.png",
        "info.png", "info_circle.png", "info-i.png", "lodging.png",
        "man.png", "marina.png", "mechanic.png", "motorcycling.png",
        "mountains.png", "movies.png", "open-diamond.png", "parking_lot.png",
        "parks.png", "partly_cloudy.png", "pharmacy_rx.png", "phone.png",
        "picnic.png", "placemark_circle.png", "placemark_circle_highlight.png",
        "placemark_square.png", "placemark_square_highlight.png", "play.png",
        "poi.png", "police.png", "polygon.png", "post_office.png",
        "rail.png", "rainy.png", "ranger_station.png", "realestate.png",
        "road_shield1.png", "road_shield2.png", "road_shield3.png", "ruler.png",
        "sailing.png", "salon.png", "schools.png", "shaded_dot.png",
        "shopping.png", "ski.png", "snack_bar.png", "snowflake_simple.png",
        "square.png", "star.png", "subway.png", "sunny.png",
        "swimming.png", "target.png", "terrain.png", "thunderstorm.png",
        "toilets.png", "trail.png", "tram.png", "triangle.png",
        "truck.png", "volcano.png", "water.png", "webcam.png",
        "wheel_chair_accessible.png", "woman.png", "yen.png"
      ]
    },
    {
      name: "Map Files",
      path: "google_earth_icons/mapfiles",
      icons: [
        "arrow.png", "arrowshadow.png", "arrowtransparent.png",
        "dir_0.png", "dir_3.png", "dir_6.png", "dir_9.png", "dir_12.png",
        "dir_15.png", "dir_18.png", "dir_21.png", "dir_24.png", "dir_27.png",
        "dir_30.png", "dir_33.png", "dir_36.png", "dir_39.png", "dir_42.png",
        "dir_45.png", "dir_48.png", "dir_51.png", "dir_54.png", "dir_57.png",
        "dir_60.png", "dir_63.png", "dir_66.png", "dir_69.png", "dir_72.png",
        "dir_75.png", "dir_78.png", "dir_81.png", "dir_84.png", "dir_87.png",
        "dir_90.png", "dir_93.png", "dir_96.png", "dir_99.png", "dir_102.png",
        "dir_105.png", "dir_108.png", "dir_111.png", "dir_114.png", "dir_117.png",
        "dir_walk_0.png", "dir_walk_3.png", "dir_walk_6.png", "dir_walk_9.png",
        "dir_walk_12.png", "dir_walk_15.png", "dir_walk_18.png", "dir_walk_21.png",
        "dir_walk_24.png", "dir_walk_27.png", "dir_walk_30.png", "dir_walk_33.png",
        "dir_walk_36.png", "dir_walk_39.png", "dir_walk_42.png", "dir_walk_45.png",
        "dir_walk_48.png", "dir_walk_51.png", "dir_walk_54.png", "dir_walk_57.png",
        "dir_walk_60.png", "dir_walk_63.png", "dir_walk_66.png", "dir_walk_69.png",
        "dir_walk_72.png", "dir_walk_75.png", "dir_walk_78.png", "dir_walk_81.png",
        "dir_walk_84.png", "dir_walk_87.png", "dir_walk_90.png", "dir_walk_93.png",
        "dir_walk_96.png", "dir_walk_99.png", "dir_walk_102.png", "dir_walk_105.png",
        "dir_walk_108.png", "dir_walk_111.png", "dir_walk_114.png", "dir_walk_117.png",
        "hide-arrow.png", "show-arrow.png", "traffic.png"
      ]
    },
    {
      name: "Palette 2",
      path: "google_earth_icons/pal2",
      icons: [
        "icon0.png", "icon1.png", "icon2.png", "icon3.png", "icon4.png",
        "icon5.png", "icon6.png", "icon7.png", "icon8.png", "icon9.png",
        "icon10.png", "icon11.png", "icon12.png", "icon13.png", "icon14.png",
        "icon15.png", "icon16.png", "icon17.png", "icon18.png", "icon19.png",
        "icon20.png", "icon21.png", "icon22.png", "icon23.png", "icon24.png",
        "icon25.png", "icon26.png", "icon27.png", "icon28.png", "icon29.png",
        "icon30.png", "icon31.png", "icon32.png", "icon33.png", "icon34.png",
        "icon35.png", "icon36.png", "icon37.png", "icon38.png", "icon39.png",
        "icon40.png", "icon41.png", "icon42.png", "icon43.png", "icon44.png",
        "icon45.png", "icon46.png", "icon47.png", "icon48.png", "icon49.png",
        "icon50.png", "icon51.png", "icon52.png", "icon53.png", "icon54.png",
        "icon55.png", "icon56.png", "icon57.png", "icon58.png", "icon59.png",
        "icon60.png", "icon61.png", "icon62.png", "icon63.png"
      ]
    },
    {
      name: "Palette 3",
      path: "google_earth_icons/pal3",
      icons: [
        "icon0.png", "icon1.png", "icon2.png", "icon3.png", "icon4.png",
        "icon5.png", "icon6.png", "icon7.png", "icon8.png", "icon9.png",
        "icon10.png", "icon11.png", "icon12.png", "icon13.png", "icon14.png",
        "icon15.png", "icon16.png", "icon17.png", "icon18.png", "icon19.png",
        "icon20.png", "icon21.png", "icon22.png", "icon23.png", "icon24.png",
        "icon25.png", "icon26.png", "icon27.png", "icon28.png", "icon29.png",
        "icon30.png", "icon31.png", "icon32.png", "icon33.png", "icon34.png",
        "icon35.png", "icon36.png", "icon37.png", "icon38.png", "icon39.png",
        "icon40.png", "icon41.png", "icon42.png", "icon43.png", "icon44.png",
        "icon45.png", "icon46.png", "icon47.png", "icon48.png", "icon49.png",
        "icon50.png", "icon51.png", "icon52.png", "icon53.png", "icon54.png",
        "icon55.png", "icon56.png", "icon57.png", "icon58.png", "icon59.png",
        "icon60.png", "icon61.png", "icon62.png", "icon63.png"
      ]
    },
    {
      name: "Palette 4",
      path: "google_earth_icons/pal4",
      icons: [
        "icon0.png", "icon1.png", "icon2.png", "icon3.png", "icon4.png",
        "icon5.png", "icon6.png", "icon7.png", "icon8.png", "icon9.png",
        "icon10.png", "icon11.png", "icon12.png", "icon13.png", "icon14.png",
        "icon15.png", "icon16.png", "icon17.png", "icon18.png", "icon19.png",
        "icon20.png", "icon21.png", "icon22.png", "icon23.png", "icon24.png",
        "icon25.png", "icon26.png", "icon27.png", "icon28.png", "icon29.png",
        "icon30.png", "icon31.png", "icon32.png", "icon33.png", "icon34.png",
        "icon35.png", "icon36.png", "icon37.png", "icon38.png", "icon39.png",
        "icon40.png", "icon41.png", "icon42.png", "icon43.png", "icon44.png",
        "icon45.png", "icon46.png", "icon47.png", "icon48.png", "icon49.png",
        "icon50.png", "icon51.png", "icon52.png", "icon53.png", "icon54.png",
        "icon55.png", "icon56.png", "icon57.png", "icon58.png", "icon59.png",
        "icon60.png", "icon61.png", "icon62.png", "icon63.png"
      ]
    },
    {
      name: "Palette 5",
      path: "google_earth_icons/pal5",
      icons: [
        "icon0.png", "icon0l.png", "icon1.png", "icon1l.png", "icon2.png",
        "icon3.png", "icon4.png", "icon5.png", "icon6.png", "icon7.png",
        "icon8.png", "icon8l.png", "icon9.png", "icon9l.png", "icon10.png",
        "icon11.png", "icon12.png", "icon13.png", "icon14.png", "icon15.png",
        "icon16.png", "icon16l.png", "icon17.png", "icon17l.png", "icon18.png",
        "icon18l.png", "icon19.png", "icon19l.png", "icon20.png", "icon20l.png",
        "icon21.png", "icon21l.png", "icon22l.png", "icon23.png", "icon23l.png",
        "icon24.png", "icon24l.png", "icon25.png", "icon25l.png", "icon26.png",
        "icon26l.png", "icon27.png", "icon27l.png", "icon28.png", "icon28l.png",
        "icon29.png", "icon29l.png", "icon30.png", "icon30l.png", "icon31.png",
        "icon31l.png", "icon32.png", "icon32l.png", "icon33.png", "icon33l.png",
        "icon34.png", "icon34l.png", "icon35.png", "icon35l.png", "icon36.png",
        "icon36l.png", "icon37.png", "icon37l.png", "icon38.png", "icon38l.png",
        "icon39.png", "icon39l.png", "icon40.png", "icon40l.png", "icon41.png",
        "icon41l.png", "icon42.png", "icon43.png", "icon43l.png", "icon44.png",
        "icon44l.png", "icon45.png", "icon45l.png", "icon46.png", "icon46l.png",
        "icon47.png", "icon47l.png", "icon48.png", "icon49.png", "icon49l.png",
        "icon50.png", "icon50l.png", "icon51.png", "icon51l.png", "icon52.png",
        "icon52l.png", "icon53.png", "icon53l.png", "icon54.png", "icon54l.png",
        "icon55.png", "icon55l.png", "icon56.png", "icon57.png", "icon57l.png",
        "icon58.png", "icon58l.png", "icon59.png", "icon59l.png", "icon60.png",
        "icon60l.png", "icon61.png", "icon61l.png", "icon62.png", "icon62l.png",
        "icon63l.png"
      ]
    },
    {
      name: "Track Directional",
      path: "google_earth_icons/track-directional",
      icons: [
        "track-0.png", "track-1.png", "track-2.png", "track-3.png",
        "track-4.png", "track-5.png", "track-6.png", "track-7.png",
        "track-8.png", "track-9.png", "track-10.png", "track-11.png",
        "track-12.png", "track-13.png", "track-14.png", "track-15.png",
        "track-none.png"
      ]
    }
  ];

  return categories;
}

// Get full path for an icon
export function getIconFullPath(categoryPath: string, iconName: string): string {
  return `/${categoryPath}/${iconName}`;
}

/**
 * Extract icon name from icon path for feature naming
 * @param iconPath - Full icon path (e.g., "/google_earth_icons/shapes/airports.png")
 * @returns Clean icon name (e.g., "airports")
 */
export function getIconNameFromPath(iconPath: string): string {
  return iconPath.split('/').pop()?.replace('.png', '') || "Icon";
}
