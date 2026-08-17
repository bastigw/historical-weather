// Static UI copy, keyed semantically. Every user-visible string in the Vue
// components lives here so components can render `t('key')`.
// `{placeholders}` are filled by the second argument of `t`.
export const strings = {
  en: {
    appTitle: 'Holiday Weather',
    tagline: 'What the weather has actually been like, where and when you are going.',

    searchLabel: 'Destination',
    searchPlaceholder: 'Search a town or city…',
    searching: 'Searching…',
    searchNoResults: 'No place found. Try a different spelling.',
    searchError: 'Location search failed. Check your connection.',

    favourites: 'Saved places',
    removeFavourite: 'Remove',
    savedOffline: 'available offline',

    emptyTitle: 'Pick a destination',
    emptyBody:
      'Search for a place in Europe, then drag a window over the calendar to see what those days have looked like over the last 20 years.',

    loadingArchive: 'Loading 20 years of weather…',
    errorNoLand:
      'No land data for this point. Pick a spot a little further inland.',
    errorGeneric: 'Could not load the weather archive. Please try again.',
    retry: 'Try again',

    periodTitle: 'Your travel period',
    periodHint: 'Drag the window, or drag its edges to make the trip longer.',
    presetDay: '1 day',
    presetWeek: '1 week',
    presetTwoWeeks: '2 weeks',
    presetMonth: '1 month',
    nights: '{n} days',
    basedOn: 'Based on {n} years ({from}–{to})',

    summaryTitle: 'What to expect',
    atAGlance:
      'Expect highs around {high} and lows around {low}, with rain on about {wet} of {days} days.',
    avgHigh: 'Average high',
    avgLow: 'Average low',
    warmestDay: 'Warmest day',
    coldestNight: 'Coldest night',
    precipTotal: 'Rain over the period',
    wetDays: 'Rainy days',
    cloudCover: 'Cloud cover',
    sunshine: 'Sunshine',
    windMax: 'Strongest wind',
    frostDays: 'Frost nights',
    hotDays: 'Days above 30 °C',
    snowDays: 'Days with snowfall',
    typicalYears: 'Typical year range {from} – {to}',
    outOfDays: 'of {n} days',
    perDayUnit: 'per day',

    probabilitiesTitle: 'How likely is it?',
    probabilitiesHint:
      '“Any day” is the chance for a single day; “during the trip” is the share of years it happened at least once.',
    pWet: 'Rain',
    pFrost: 'Frost',
    pHot: 'Heat above 30 °C',
    pOvercast: 'Overcast day',
    pSnow: 'Snowfall',
    anyDay: 'Any day',
    duringTrip: 'During the trip',

    yearsTitle: 'Year by year',
    yearsHint: 'The same window in each of the last {n} years.',
    meanLine: '{n}-year average',
    trendLine: 'Trend',
    trendWarming: '{value} °C warmer per decade',
    trendCooling: '{value} °C cooler per decade',
    trendWetter: '{value} mm wetter per decade',
    trendDrier: '{value} mm drier per decade',
    trendPerDecade: '{value} {unit} per decade',
    trendFlat: 'No clear trend',
    trendCaveat: '20 years is a hint, not proof.',

    climatologyTitle: 'Around your period',
    climatologyHint:
      'Daily highs and lows through the season. The band shows the middle half of years, the line the median.',
    selectedPeriod: 'Selected period',

    metricTemperature: 'Temperature',
    metricPrecipitation: 'Rain',
    metricSunshine: 'Sunshine',
    metricCloud: 'Cloud',

    gridPoint: 'Grid point {lat}, {lon} at {elevation} m',
    language: 'Language',

    footerDisclaimer:
      'This is history, not a forecast. It shows what these days have been like, not what they will be.',
    footerSource:
      'Weather data: Copernicus ERA5 / ERA5-Land reanalysis (ECMWF) via Open-Meteo, CC BY 4.0.',
  },

  de: {
    appTitle: 'Urlaubswetter',
    tagline: 'Wie das Wetter am Reiseziel wirklich war – zur passenden Jahreszeit.',

    searchLabel: 'Reiseziel',
    searchPlaceholder: 'Ort oder Stadt suchen…',
    searching: 'Suche…',
    searchNoResults: 'Kein Ort gefunden. Andere Schreibweise versuchen.',
    searchError: 'Ortssuche fehlgeschlagen. Verbindung prüfen.',

    favourites: 'Gespeicherte Orte',
    removeFavourite: 'Entfernen',
    savedOffline: 'offline verfügbar',

    emptyTitle: 'Reiseziel wählen',
    emptyBody:
      'Suche einen Ort in Europa und ziehe dann ein Fenster über den Kalender, um zu sehen, wie diese Tage in den letzten 20 Jahren waren.',

    loadingArchive: 'Lade 20 Jahre Wetterdaten…',
    errorNoLand:
      'Für diesen Punkt gibt es keine Landdaten. Bitte einen Punkt etwas weiter im Landesinneren wählen.',
    errorGeneric: 'Das Wetterarchiv konnte nicht geladen werden. Bitte erneut versuchen.',
    retry: 'Erneut versuchen',

    periodTitle: 'Dein Reisezeitraum',
    periodHint: 'Fenster verschieben oder an den Rändern ziehen, um den Zeitraum zu ändern.',
    presetDay: '1 Tag',
    presetWeek: '1 Woche',
    presetTwoWeeks: '2 Wochen',
    presetMonth: '1 Monat',
    nights: '{n} Tage',
    basedOn: 'Basis: {n} Jahre ({from}–{to})',

    summaryTitle: 'Das erwartet dich',
    atAGlance:
      'Höchstwerte um {high}, Tiefstwerte um {low}, Regen an etwa {wet} von {days} Tagen.',
    avgHigh: 'Höchstwert im Mittel',
    avgLow: 'Tiefstwert im Mittel',
    warmestDay: 'Wärmster Tag',
    coldestNight: 'Kälteste Nacht',
    precipTotal: 'Niederschlag im Zeitraum',
    wetDays: 'Regentage',
    cloudCover: 'Bewölkung',
    sunshine: 'Sonnenschein',
    windMax: 'Stärkster Wind',
    frostDays: 'Frostnächte',
    hotDays: 'Tage über 30 °C',
    snowDays: 'Tage mit Schneefall',
    typicalYears: 'Übliche Bandbreite {from} – {to}',
    outOfDays: 'von {n} Tagen',
    perDayUnit: 'pro Tag',

    probabilitiesTitle: 'Wie wahrscheinlich?',
    probabilitiesHint:
      '„Einzelner Tag“ ist die Chance für einen Tag, „im Zeitraum“ der Anteil der Jahre mit mindestens einem solchen Tag.',
    pWet: 'Regen',
    pFrost: 'Frost',
    pHot: 'Hitze über 30 °C',
    pOvercast: 'Trüber Tag',
    pSnow: 'Schneefall',
    anyDay: 'Einzelner Tag',
    duringTrip: 'Im Zeitraum',

    yearsTitle: 'Jahr für Jahr',
    yearsHint: 'Derselbe Zeitraum in jedem der letzten {n} Jahre.',
    meanLine: 'Mittel über {n} Jahre',
    trendLine: 'Trend',
    trendWarming: '{value} °C wärmer pro Jahrzehnt',
    trendCooling: '{value} °C kühler pro Jahrzehnt',
    trendWetter: '{value} mm mehr Regen pro Jahrzehnt',
    trendDrier: '{value} mm weniger Regen pro Jahrzehnt',
    trendPerDecade: '{value} {unit} pro Jahrzehnt',
    trendFlat: 'Kein klarer Trend',
    trendCaveat: '20 Jahre sind ein Hinweis, kein Beweis.',

    climatologyTitle: 'Rund um deinen Zeitraum',
    climatologyHint:
      'Tageshöchst- und -tiefstwerte im Saisonverlauf. Das Band zeigt die mittlere Hälfte der Jahre, die Linie den Median.',
    selectedPeriod: 'Gewählter Zeitraum',

    metricTemperature: 'Temperatur',
    metricPrecipitation: 'Regen',
    metricSunshine: 'Sonne',
    metricCloud: 'Bewölkung',

    gridPoint: 'Gitterpunkt {lat}, {lon} auf {elevation} m',
    language: 'Sprache',

    footerDisclaimer:
      'Das ist Vergangenheit, keine Vorhersage. Es zeigt, wie diese Tage waren – nicht, wie sie werden.',
    footerSource:
      'Wetterdaten: Copernicus ERA5 / ERA5-Land Reanalyse (ECMWF) über Open-Meteo, CC BY 4.0.',
  },
}

export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
]
