/* Fragenkatalog "Der Dümmste fliegt"
   Format: Frage|Antwort            (Antwort-Alternativen mit " / " trennen)
           Frage|Antwort|S          (S = Schätzfrage: wer näher dran ist, bekommt den Punkt)
   Zeilen mit # setzen die Kategorie. */
const DDF_QUESTIONS_NORMAL = String.raw`
# Geografie
Wie heißt die Hauptstadt von Frankreich?|Paris
Wie heißt die Hauptstadt von Italien?|Rom
Wie heißt die Hauptstadt von Spanien?|Madrid
Wie heißt die Hauptstadt von Österreich?|Wien
Wie heißt die Hauptstadt der Schweiz?|Bern
Wie heißt die Hauptstadt von Polen?|Warschau
Wie heißt die Hauptstadt von Tschechien?|Prag
Wie heißt die Hauptstadt von Ungarn?|Budapest
Wie heißt die Hauptstadt von Portugal?|Lissabon
Wie heißt die Hauptstadt der Niederlande?|Amsterdam
Wie heißt die Hauptstadt von Belgien?|Brüssel
Wie heißt die Hauptstadt von Dänemark?|Kopenhagen
Wie heißt die Hauptstadt von Schweden?|Stockholm
Wie heißt die Hauptstadt von Norwegen?|Oslo
Wie heißt die Hauptstadt von Finnland?|Helsinki
Wie heißt die Hauptstadt von Griechenland?|Athen
Wie heißt die Hauptstadt der Türkei?|Ankara
Wie heißt die Hauptstadt von Japan?|Tokio
Wie heißt die Hauptstadt von China?|Peking
Wie heißt die Hauptstadt von Australien?|Canberra
Wie heißt die Hauptstadt von Kanada?|Ottawa
Wie heißt die Hauptstadt der USA?|Washington, D.C.
Wie heißt die Hauptstadt von Ägypten?|Kairo
Wie heißt die Hauptstadt von Russland?|Moskau
Wie heißt die Hauptstadt von Irland?|Dublin
Wie heißt die Hauptstadt von Großbritannien?|London
Wie heißt die Hauptstadt von Argentinien?|Buenos Aires
Wie heißt die Hauptstadt von Brasilien?|Brasília
Wie heißt die Hauptstadt von Mexiko?|Mexiko-Stadt
Wie heißt die Hauptstadt von Indien?|Neu-Delhi
Wie heißt die Hauptstadt von Südkorea?|Seoul
Wie heißt die Hauptstadt von Thailand?|Bangkok
Wie heißt die Hauptstadt von Kroatien?|Zagreb
Wie heißt die Hauptstadt von Slowenien?|Ljubljana
Wie heißt die Hauptstadt von Island?|Reykjavík
Wie heißt die Hauptstadt von Neuseeland?|Wellington
Wie heißt die Hauptstadt von Kenia?|Nairobi
Wie heißt die Hauptstadt von Peru?|Lima
Wie heißt die Hauptstadt der Ukraine?|Kiew / Kyjiw
Wie heißt die Hauptstadt von Rumänien?|Bukarest
Wie heißt die Landeshauptstadt von Bayern?|München
Wie heißt die Landeshauptstadt von Nordrhein-Westfalen?|Düsseldorf
Wie heißt die Landeshauptstadt von Niedersachsen?|Hannover
Wie heißt die Landeshauptstadt von Hessen?|Wiesbaden
Wie heißt die Landeshauptstadt von Baden-Württemberg?|Stuttgart
Wie heißt die Landeshauptstadt von Sachsen?|Dresden
Wie heißt die Landeshauptstadt von Schleswig-Holstein?|Kiel
Wie heißt die Landeshauptstadt von Rheinland-Pfalz?|Mainz
Wie heißt die Landeshauptstadt von Thüringen?|Erfurt
Wie heißt die Landeshauptstadt von Mecklenburg-Vorpommern?|Schwerin
Wie heißt die Landeshauptstadt von Brandenburg?|Potsdam
Wie heißt die Landeshauptstadt von Sachsen-Anhalt?|Magdeburg
Wie heißt die Landeshauptstadt des Saarlandes?|Saarbrücken
Wie viele Bundesländer hat Deutschland?|16
Zu welchem Bundesland gehört Bremerhaven?|Bremen
Was ist auf dem Bremer Wappen abgebildet?|Ein Schlüssel
Wie heißt die berühmte Ritter-Statue auf dem Bremer Marktplatz?|Roland
Welcher Fluss fließt durch Köln?|Rhein
Welcher Fluss fließt durch Hamburg?|Elbe
Welcher Fluss fließt durch Dresden?|Elbe
Welcher Fluss fließt durch Wien?|Donau
Welcher Fluss fließt durch London?|Themse
Welcher Fluss fließt durch Paris?|Seine
Welcher Fluss fließt durch Rom?|Tiber
Welcher Fluss fließt durch Kairo?|Nil
Welcher Fluss fließt durch Frankfurt?|Main
Welcher Fluss fließt durch Berlin?|Spree / Havel
Welcher Fluss fließt durch Bremen?|Weser
Welcher Fluss fließt durch München?|Isar
Welcher Fluss fließt durch Prag?|Moldau
Wie heißt der höchste Berg der Welt?|Mount Everest
Wie heißt der höchste Berg Deutschlands?|Zugspitze
Wie heißt der höchste Berg Afrikas?|Kilimandscharo
Wie heißt der höchste Berg der Alpen?|Mont Blanc
Wie heißt der größte Ozean der Erde?|Pazifik
Welcher Ozean liegt zwischen Europa und Amerika?|Atlantik
Welches Meer liegt zwischen Europa und Afrika?|Mittelmeer
An welche zwei Meere grenzt Deutschland?|Nordsee und Ostsee
Auf welchem Kontinent liegt Ägypten?|Afrika
Auf welchem Kontinent liegt Brasilien?|Südamerika
Welches ist das flächenmäßig größte Land der Erde?|Russland
Welcher Kontinent hat die meisten Einwohner?|Asien
Welcher Kontinent hat die meisten Länder?|Afrika
Welcher Kontinent liegt am Südpol?|Antarktis
Wie heißt die größte Insel der Welt?|Grönland
Wie heißt die größte deutsche Insel?|Rügen
Wie heißt die größte heiße Wüste der Welt?|Sahara
In welchem Land steht der Eiffelturm?|Frankreich
In welcher Stadt steht das Kolosseum?|Rom
In welcher Stadt steht das Brandenburger Tor?|Berlin
In welcher Stadt steht der Schiefe Turm?|Pisa
In welchem Land stehen die Pyramiden von Gizeh?|Ägypten
In welchem Land liegt Machu Picchu?|Peru
In welcher Stadt steht die Freiheitsstatue?|New York
In welchem Land liegt Venedig?|Italien
In welcher Stadt steht der Big Ben?|London
Zu welchem Land gehört Mallorca?|Spanien
Zu welchem Land gehört Kreta?|Griechenland
Zu welchem Land gehört Sizilien?|Italien
Zu welchem Land gehört Grönland?|Dänemark
Welches Land hat die Form eines Stiefels?|Italien
Welche Stadt wird auch „Big Apple“ genannt?|New York
Welcher US-Bundesstaat besteht aus Inseln im Pazifik?|Hawaii
Welches Land ist bekannt für Tulpen und Windmühlen?|Niederlande
Wie heißt die Meerenge zwischen Spanien und Marokko?|Straße von Gibraltar
Wie heißt der größte See, der komplett in Deutschland liegt?|Müritz
An welchem See liegen Deutschland, Österreich und die Schweiz?|Bodensee
Vor welchem Land liegt das Great Barrier Reef?|Australien
Welches Gebirge gilt als Grenze zwischen Europa und Asien?|Ural
In welcher Stadt findet das Oktoberfest statt?|München
Wie heißt das berühmte Märchenschloss von König Ludwig II.?|Neuschwanstein
Wie nennen die Hamburger ihre Hauptkirche St. Michaelis?|Michel
In welcher Stadt steht der höchste Fernsehturm Deutschlands?|Berlin
Wie viele Zeitzonen hat Deutschland?|Eine
# Natur & Tiere
Wie viele Beine hat eine Spinne?|8
Wie viele Beine hat ein Insekt?|6
Wie heißt das größte Tier der Welt?|Blauwal
Welches Landtier ist das schnellste?|Gepard
Welches Tier hat den längsten Hals?|Giraffe
Welches Tier gilt als „König der Tiere“?|Löwe
Welches Tier baut Dämme im Fluss?|Biber
Welches Tier baut sechseckige Waben?|Biene
Wie nennt man ein weibliches Pferd?|Stute
Wie nennt man ein männliches Schwein?|Eber
Wie nennt man eine männliche Ziege?|Bock / Ziegenbock
Wie nennt man ein junges Schaf?|Lamm
Wie nennt man ein junges Pferd?|Fohlen
Wie nennt man eine männliche Ente?|Erpel
Wie nennt man einen weiblichen Fuchs?|Füchsin / Fähe
Wie nennt man einen weiblichen Hirsch?|Hirschkuh / Hindin
Welches Tier hat einen Schnabel, legt Eier und gibt Milch?|Schnabeltier
Welches Tier kann seine Augen unabhängig voneinander bewegen?|Chamäleon
Welches Tier ist das Wappentier der USA?|Weißkopfseeadler
Welches Tier ist das Wappentier Deutschlands?|Adler
Welches Tier ist das Wappentier von Berlin?|Bär
Welches Säugetier kann richtig fliegen?|Fledermaus
Wie heißt das größte Nagetier der Welt?|Capybara / Wasserschwein
Wie heißt der größte lebende Vogel?|Strauß
Welcher Vogel gilt als Symbol des Friedens?|Taube
Welcher Vogel ist für sein Trommeln an Bäumen bekannt?|Specht
Welche Farbe hat ein Flamingo meistens?|Rosa / Pink
Welches heimische Tier ist für seine Stacheln bekannt?|Igel
Wie viele Herzen hat ein Oktopus?|3
Wie viele Arme hat ein Oktopus?|8
Wovon ernähren sich Koalas hauptsächlich?|Eukalyptusblätter
Was fressen Pandas hauptsächlich?|Bambus
In welchem Land leben Kängurus in freier Wildbahn?|Australien
Welches Tier wird „Wüstenschiff“ genannt?|Kamel
Wie viele Höcker hat ein Dromedar?|1
Wie viele Höcker hat ein Trampeltier?|2
Welche zwei Tiere tragen ihr Haus auf dem Rücken?|Schnecke und Schildkröte
Ist ein Wal ein Fisch oder ein Säugetier?|Säugetier
Wie heißt die Larve eines Frosches?|Kaulquappe
Welches Tier hält Winterschlaf: Igel oder Eichhörnchen?|Igel (Eichhörnchen halten nur Winterruhe)
Welcher Fisch ist der größte Fisch der Welt?|Walhai
Welches Tier ist im Sturzflug das schnellste der Welt?|Wanderfalke
Was für ein Fisch ist Nemo aus „Findet Nemo“?|Clownfisch / Anemonenfisch
Wie nennt man ein Baby-Känguru?|Joey
Wie nennt man eine Gruppe von Wölfen?|Rudel
Wie nennt man eine große Gruppe von Fischen?|Schwarm
Wie viele Flügel hat eine Biene?|4
Wie viele Augen hat eine Biene?|5
Welches Tier ist das Symbol des WWF?|Panda
Was wird aus einer Raupe?|Schmetterling
Welches Tier ist ein Wiederkäuer: Kuh oder Pferd?|Kuh
Wie viele Zähne hat ein erwachsener Mensch normalerweise?|32
Was ist das größte Organ des Menschen?|Haut
Wie heißt der längste Knochen im menschlichen Körper?|Oberschenkelknochen
In welchem Organ liegt der kleinste Knochen des Menschen?|Ohr
Welches Organ pumpt das Blut durch den Körper?|Herz
Welche Blutgruppe gilt als Universalspender?|0 negativ
Welches Vitamin bildet der Körper mithilfe von Sonnenlicht?|Vitamin D
Welches Vitamin steckt besonders viel in Zitrusfrüchten?|Vitamin C
Welches Gas atmen wir aus, das Pflanzen brauchen?|Kohlendioxid / CO2
Welches Gas brauchen wir zum Atmen?|Sauerstoff
Wie viele Sinne hat der Mensch klassischerweise?|5
Aus welcher Pflanze wird in Europa meistens Zucker gewonnen?|Zuckerrübe
Welcher Baum trägt Eicheln?|Eiche
Welche Blume ist das Symbol der Niederlande?|Tulpe
Zu welcher Pflanzenfamilie gehört die Vanille?|Orchideen
Aus welcher Pflanze wird Tequila hergestellt?|Agave
Wie nennt man den Vorgang, bei dem Pflanzen mit Licht Energie gewinnen?|Photosynthese
Welche Farbe hat ein Smaragd?|Grün
Welche Farbe hat ein Rubin?|Rot
# Weltall
Welcher Planet ist der Sonne am nächsten?|Merkur
Welcher Planet ist der größte unseres Sonnensystems?|Jupiter
Welcher Planet ist besonders für seine Ringe bekannt?|Saturn
Welcher Planet wird „Roter Planet“ genannt?|Mars
Welcher Planet ist der Erde in der Größe am ähnlichsten?|Venus
Wie viele Planeten hat unser Sonnensystem?|8
Wie heißt unsere Galaxie?|Milchstraße
Wie lange braucht die Erde für eine Runde um die Sonne?|Ein Jahr
Wer war der erste Mensch auf dem Mond?|Neil Armstrong
Gibt ein Lichtjahr eine Zeit oder eine Entfernung an?|Eine Entfernung
Wie schnell ist Licht ungefähr?|Etwa 300.000 km pro Sekunde
Welcher Planet ist der größte Gesteinsplanet?|Erde
# Wissenschaft & Technik
In welcher Einheit misst man elektrische Spannung?|Volt
In welcher Einheit misst man elektrische Stromstärke?|Ampere
In welcher Einheit misst man elektrischen Widerstand?|Ohm
In welcher Einheit misst man elektrische Leistung?|Watt
In welcher Einheit misst man Frequenz?|Hertz
In welcher Einheit misst man Kraft?|Newton
Wie lautet die chemische Formel von Wasser?|H2O
Welches chemische Symbol hat Gold?|Au
Welches chemische Symbol hat Eisen?|Fe
Welches Gas ist leichter als Luft und steckt oft in Luftballons?|Helium
Bei wie viel Grad Celsius kocht Wasser auf Meereshöhe?|100 °C
Bei wie viel Grad Celsius gefriert Wasser?|0 °C
Bei wie viel Grad Fahrenheit gefriert Wasser?|32 °F
Mit welchem Gerät misst man die Temperatur?|Thermometer
Mit welchem Gerät misst man den Luftdruck?|Barometer
Welches Metall ist bei Zimmertemperatur flüssig?|Quecksilber
Welches Metall leitet Strom am besten?|Silber
Woraus wird Glas hauptsächlich hergestellt?|Sand / Quarzsand
Aus welchem Gas besteht unsere Luft größtenteils?|Stickstoff
Wie nennt man die kleinste Einheit digitaler Information?|Bit
Wie viele Bit hat ein Byte?|8
Was ist größer: ein Kilobyte oder ein Megabyte?|Megabyte
Wofür steht die Abkürzung „WWW“?|World Wide Web
Wofür steht die Abkürzung „USB“?|Universal Serial Bus
Wofür steht die Abkürzung „CPU“?|Central Processing Unit
Wofür steht die Abkürzung „GPS“?|Global Positioning System
Wofür steht die Abkürzung „FAQ“?|Frequently Asked Questions
Wofür steht die Abkürzung „DIY“?|Do it yourself
Wofür steht die Abkürzung „HTML“?|Hypertext Markup Language
Was passiert mit „Strg + Z“?|Rückgängig machen
Welche Tastenkombination fügt Kopiertes ein?|Strg + V
Welche Firma stellt die PlayStation her?|Sony
Welche Firma stellt die Xbox her?|Microsoft
Welches Tier ist das Maskottchen von Linux?|Pinguin
Wer entwickelte die Relativitätstheorie?|Albert Einstein
Wer erfand in Europa den Buchdruck mit beweglichen Lettern?|Johannes Gutenberg
Welche Farbe entsteht, wenn man Blau und Gelb mischt?|Grün
Welche Farbe entsteht, wenn man Rot und Blau mischt?|Lila / Violett
Welche Farbe entsteht, wenn man Rot und Gelb mischt?|Orange
Welche Farbe entsteht, wenn man Rot und Weiß mischt?|Rosa
Wie viele Farben hat ein Regenbogen klassischerweise?|7
Wie heißt die Kraft, die uns auf dem Boden hält?|Schwerkraft / Gravitation
Wie nennt man gefrorenes Wasser?|Eis
Wie heißt das Gegenteil von Ebbe?|Flut
# Mathe & Zahlen
Wie viel ist 7 mal 8?|56
Wie viel ist 12 mal 12?|144
Wie viel ist 9 mal 9?|81
Wie viel ist 25 mal 4?|100
Wie viel ist 17 plus 28?|45
Wie viel ist 100 minus 37?|63
Wie viel ist 1000 geteilt durch 8?|125
Wie viel sind 15 Prozent von 200?|30
Wie viel ist die Hälfte von einem Drittel?|Ein Sechstel
Was ist mehr: ein Viertel oder ein Drittel?|Ein Drittel
Welche Zahl ist größer: 0,5 oder 0,45?|0,5
Wie viel ist 3 hoch 3?|27
Wie viel ist 2 hoch 10?|1024
Was ist die Quadratwurzel aus 81?|9
Wie viele Sekunden hat eine Stunde?|3600
Wie viele Minuten hat ein Tag?|1440
Wie viele Stunden hat eine Woche?|168
Wie viele Minuten hat eine Dreiviertelstunde?|45
Wie viele Tage hat ein Schaltjahr?|366
Wie viele Wochen hat ein Jahr ungefähr?|52
Wie viele Monate haben 31 Tage?|7
Wie viele Monate haben 28 Tage?|Alle 12
Wie viele Monate hat ein Quartal?|3
Wie viele Nullen hat eine Million?|6
Wie viele Nullen hat eine Milliarde?|9
Wie viele Millimeter sind ein Zentimeter?|10
Wie viele Zentimeter sind ein Meter?|100
Wie viele Zentimeter sind ein Dezimeter?|10
Wie viele Meter sind ein Kilometer?|1000
Wie viele Gramm sind ein Kilogramm?|1000
Wie viele Milliliter sind ein Liter?|1000
Wie viele Seiten hat ein Würfel?|6
Wie viele Ecken hat ein Würfel?|8
Wie viele Kanten hat ein Würfel?|12
Wie viele Augen hat ein normaler Würfel insgesamt?|21
Welche Zahl liegt auf einem Würfel gegenüber der 6?|1
Wie nennt man ein Vieleck mit acht Ecken?|Achteck / Oktagon
Wie viele Ecken hat ein Pentagon?|5
Wie viel Grad hat ein rechter Winkel?|90
Wie viel Grad ergeben die drei Winkel eines Dreiecks zusammen?|180
Wie heißt die längste Seite im rechtwinkligen Dreieck?|Hypotenuse
Welche römische Zahl steht für 50?|L
Welche römische Zahl steht für 100?|C
Welche Jahreszahl ist „MMXX“?|2020
Wie nennt man eine Zahl, die nur durch 1 und sich selbst teilbar ist?|Primzahl
Ist 1 eine Primzahl?|Nein
Wie nennt man eine Zahl ohne Nachkommastellen?|Ganze Zahl
Wie heißt das Ergebnis einer Multiplikation?|Produkt
Wie heißt das Ergebnis einer Addition?|Summe
Wie viel ist ein Dutzend?|12
# Sprache & Alltag
Wie viele Buchstaben hat das deutsche Alphabet ohne Umlaute und ß?|26
Welcher Buchstabe kommt im Alphabet nach dem Q?|R
Wie lautet die Mehrzahl von „Kaktus“?|Kakteen / Kaktusse
Wie lautet die Mehrzahl von „Globus“?|Globen / Globusse
Wie nennt man ein Wort, das vorwärts und rückwärts gleich ist, wie „Otto“?|Palindrom
Was heißt „Butterfly“ auf Deutsch?|Schmetterling
Was heißt „Danke“ auf Spanisch?|Gracias
Was heißt „Brot“ auf Französisch?|Pain
Welche Sprache spricht man in Brasilien?|Portugiesisch
Wie viele Landessprachen hat die Schweiz?|4
Wie nennt man den Schaum auf einem frisch gezapften Bier?|Schaumkrone / Blume
Wie nennt man den Beruf, der Bücher in einer Bibliothek verwaltet?|Bibliothekar
Wie nennt man den Beruf, der Gebäude entwirft?|Architekt
Wie nennt man den Beruf, der in der Apotheke Medikamente ausgibt?|Apotheker
Wie nennt man einen Tierarzt mit Fachbegriff?|Veterinär
Welche Himmelsrichtung liegt gegenüber von Osten?|Westen
In welcher Himmelsrichtung geht die Sonne auf?|Osten
Wie viele Tage hat der Februar in einem normalen Jahr?|28
Welche Jahreszeit kommt nach dem Winter?|Frühling
Mit welchem Monat beginnt der meteorologische Sommer?|Juni
Wie nennt man ein Jahr mit 366 Tagen?|Schaltjahr
Wie viele Jahre hat ein Jahrhundert?|100
Wie nennt man einen Zeitraum von 1000 Jahren?|Jahrtausend / Millennium
Wann ist der Tag der Deutschen Einheit?|3. Oktober
In welchem Monat ist Halloween?|Oktober
Wie viele Kerzen hat ein Adventskranz meistens?|4
Was feiert man an Silvester?|Den Jahreswechsel
Welche Form hat ein Stoppschild?|Achteck
Welche Form hat das Verkehrsschild „Vorfahrt gewähren“?|Dreieck (mit der Spitze nach unten)
Welche Form hat das Schild „Vorfahrtstraße“?|Raute
Wie lautet in Deutschland die Notrufnummer der Feuerwehr?|112
Wie lautet in Deutschland die Notrufnummer der Polizei?|110
Welche Farbe haben die meisten Schulbusse in den USA?|Gelb
Wie viele Streifen hat die Flagge der USA?|13
Wie viele Sterne hat die Flagge der USA?|50
Welche Uhrzeit ist „Viertel nach drei“ am Nachmittag im 24-Stunden-Format?|15:15
# Geschichte & Kultur
In welchem Jahr fiel die Berliner Mauer?|1989
In welchem Jahr wurde Deutschland wiedervereinigt?|1990
In welchem Jahr begann der Zweite Weltkrieg?|1939
In welchem Jahr endete der Zweite Weltkrieg?|1945
In welchem Jahr landeten zum ersten Mal Menschen auf dem Mond?|1969
Wer erreichte 1492 Amerika und hielt es für Indien?|Christoph Kolumbus
Wer war der erste Bundeskanzler der Bundesrepublik Deutschland?|Konrad Adenauer
Wer war der erste Präsident der USA?|George Washington
Welcher Herrscher wurde im Jahr 800 zum Kaiser gekrönt?|Karl der Große
Welche Stadt war vor Berlin Regierungssitz der Bundesrepublik?|Bonn
Wie heißt das deutsche Parlament?|Bundestag
Wie viele Sterne hat die Flagge der Europäischen Union?|12
Welche Farbe haben die Sterne auf der EU-Flagge?|Gelb / Gold
Welche drei Farben hat die deutsche Flagge?|Schwarz, Rot, Gold
Welche Währung hat die Schweiz?|Schweizer Franken
Welche Währung hat Großbritannien?|Pfund Sterling
Welche Währung hat Japan?|Yen
Welche Währung hatte Deutschland vor dem Euro?|D-Mark
In welchem Jahr kam der Euro als Bargeld?|2002
Wer malte die Mona Lisa?|Leonardo da Vinci
Wer schrieb „Romeo und Julia“?|William Shakespeare
Wer schrieb „Faust“?|Johann Wolfgang von Goethe
Wer komponierte die 9. Sinfonie mit der „Ode an die Freude“?|Ludwig van Beethoven
Welcher berühmte Komponist wurde in Salzburg geboren?|Wolfgang Amadeus Mozart
Wer malte „Die Sternennacht“?|Vincent van Gogh
Welche Brüder sammelten viele deutsche Märchen?|Die Brüder Grimm
In welchem Märchen schläft eine Prinzessin hundert Jahre lang?|Dornröschen
Welche Märchenfigur verliert auf dem Ball ihren Schuh?|Aschenputtel / Cinderella
Welche vier Tiere sind die Bremer Stadtmusikanten?|Esel, Hund, Katze, Hahn
Welche Märchenfigur lässt ihre langen Haare aus dem Turm herunter?|Rapunzel
Welches Tier frisst im Märchen die Großmutter von Rotkäppchen?|Der Wolf
Bei wie vielen Zwergen lebt Schneewittchen?|7
Von welchem dänischen Dichter stammt „Die kleine Meerjungfrau“?|Hans Christian Andersen
# Sport & Spiele
Wie viele Spieler einer Fußballmannschaft stehen auf dem Feld?|11
Wie viele Spieler stehen beim Volleyball pro Team auf dem Feld?|6
Wie viele Spieler stehen beim Basketball pro Team auf dem Feld?|5
Wie viele Spieler stehen beim Handball pro Team auf dem Feld?|7
Wie viele Spieler stehen beim Eishockey pro Team auf dem Eis?|6
Wie lange dauert ein Fußballspiel ohne Nachspielzeit?|90 Minuten
Wie heißt das Spielgerät beim Eishockey?|Puck
Wie viele Ringe hat das olympische Symbol?|5
Alle wie viele Jahre finden Olympische Sommerspiele statt?|Alle 4 Jahre
In welcher Sportart gibt es ein „Hole-in-One“?|Golf
In welcher Sportart gibt es einen „Touchdown“?|American Football
Bei welcher Sportart turnt man auf dem Schwebebalken?|Turnen / Gerätturnen
Aus welchen drei Sportarten besteht ein Triathlon?|Schwimmen, Radfahren, Laufen
Wie lang ist ein Marathon?|42,195 km
Welcher Verein ist Rekordmeister der Fußball-Bundesliga?|FC Bayern München
Welches Land hat bei den Männern die meisten Fußball-WM-Titel?|Brasilien
Wie oft wurde die deutsche Männer-Nationalmannschaft Fußball-Weltmeister?|4-mal
Welche Farbe zeigt der Schiedsrichter für einen Platzverweis?|Rot
Was ist im Fußball ein Hattrick?|Drei Tore eines Spielers in einem Spiel
Wie viele Löcher hat ein normaler Golfplatz?|18
Welche Farbe hat ein typischer Tennisball?|Gelb
Welche Sportart verbindet man mit Wimbledon?|Tennis
In welcher Kampfsportart gibt es den „Ippon“?|Judo
Bis wie viele Punkte geht ein Satz im Tischtennis normalerweise?|11
Welche Schachfigur zieht nur diagonal?|Läufer
Wie viele Felder hat ein Schachbrett?|64
Wie heißt der höchste Titel im Schach?|Großmeister
Wie heißt das Spiel zwischen dem FC Barcelona und Real Madrid?|El Clásico
Wie heißt das berühmteste Radrennen in Frankreich?|Tour de France
In welcher Sportart gibt es den „Slam Dunk“?|Basketball
Wie viele Punkte bringt das rote Bullseye beim Darts?|50
Wie viele Pins stehen beim Bowling?|10
Wie viele Karten hat ein Skatblatt?|32
Wie viele Felder hat ein Tic-Tac-Toe-Spielfeld?|9
Wie viele Farben hat ein klassischer Zauberwürfel?|6
# Essen & Trinken
Welches Gemüse braucht man für Sauerkraut?|Weißkohl
Aus welchem Land stammt die Pizza?|Italien
Welcher Käse kommt klassisch auf eine Pizza Margherita?|Mozzarella
Aus welchem Land stammt Sushi?|Japan
Aus welchem Land kommt der Gouda?|Niederlande
Aus welcher Frucht macht man Guacamole?|Avocado
Welche Nuss steckt in Nutella?|Haselnuss
Woraus macht man Pommes?|Kartoffeln
Woraus wird Popcorn gemacht?|Mais
Welche Frucht ist außen stachelig und innen gelb?|Ananas
Welche krumme Frucht ist erst grün und dann gelb?|Banane
Welche Frucht hat pinkes oder weißes Fruchtfleisch mit vielen kleinen schwarzen Kernen?|Drachenfrucht / Pitahaya
Welche Frucht hat einen harten Kern und orangefarbenes Fruchtfleisch?|Aprikose / Marille
Wie heißt die größte Zitrusfrucht?|Pomelo
Welche Frucht wächst an einem Weinstock?|Weintraube
Aus welcher Frucht wird Cidre gemacht?|Apfel
Aus welcher Bohne wird Tofu hergestellt?|Sojabohne
Welches Gewürz wird aus der Rinde eines Baumes gewonnen?|Zimt
Welches Gewürz gilt als das teuerste der Welt?|Safran
Welche Farbe hat das Innere einer Kiwi meistens?|Grün
Aus welchem Fleisch ist ein echtes Wiener Schnitzel?|Kalbfleisch
Aus welchem Land stammt die Paella?|Spanien
Woraus wird Butter gemacht?|Sahne / Rahm
Was ist die Hauptzutat von Hummus?|Kichererbsen
Wie heißt das italienische Kaffeegetränk mit viel Milchschaum?|Cappuccino
Was liegt auf einem „Strammen Max“?|Schinken und Spiegelei
Woraus wird Marzipan hauptsächlich gemacht?|Mandeln und Zucker
Welche Stadt ist berühmt für ihre Lebkuchen?|Nürnberg
Aus welchen Hauptzutaten wird Bier gebraut?|Wasser, Malz, Hopfen, Hefe
# Popkultur & Gaming
Wie heißt die Zauberschule in Harry Potter?|Hogwarts
Wie heißt der beste Freund von SpongeBob?|Patrick
Wie heißt das Eichhörnchen aus SpongeBob?|Sandy
Welche Tiere sind Timon und Pumbaa?|Erdmännchen und Warzenschwein
Wie heißt der junge Löwe in „Der König der Löwen“?|Simba
Wie heißt der Schneemann in „Die Eiskönigin“?|Olaf
Wie heißt die Prinzessin, die Mario immer wieder rettet?|Peach
Welche Farbe hat Pac-Man?|Gelb
Wie heißt der Bruder von Mario?|Luigi
Wie heißt das gelbe Elektro-Pokémon, das jeder kennt?|Pikachu
Welche drei Starter-Pokémon gibt es in Pokémon Rot und Blau?|Bisasam, Glumanda, Schiggy
Was explodiert in Minecraft, wenn es sich an dich heranschleicht?|Creeper
Welches Mario-Kart-Item jagt den Erstplatzierten?|Stachi-Panzer / blauer Panzer
Welche Farbe hat das Logo von Twitch?|Lila
Wie heißt der blaue Igel von SEGA?|Sonic
Nenne einen der vier Ninja Turtles.|Leonardo, Michelangelo, Donatello oder Raphael
Wie heißt der Zauberer mit dem grauen Gewand in „Der Herr der Ringe“?|Gandalf
Welcher Hobbit trägt in „Der Herr der Ringe“ den Ring?|Frodo
Welcher Superheld wird von einer Spinne gebissen?|Spider-Man
In welcher Stadt kämpft Batman gegen das Verbrechen?|Gotham City
Welcher Superheld hat einen Hammer namens Mjölnir?|Thor
Wer singt „Atemlos durch die Nacht“?|Helene Fischer
Aus welchem Land kommt die Band ABBA?|Schweden
Wer wird „King of Pop“ genannt?|Michael Jackson
Aus welchem Disney-Film stammt das Lied „Hakuna Matata“?|Der König der Löwen
Wie heißt die kleine Meerjungfrau bei Disney?|Arielle
Wie heißt der grüne Oger aus dem Sumpf?|Shrek
Wie heißt der Hund von Micky Maus?|Pluto
Wie heißt der Sohn von Darth Vader?|Luke Skywalker
In welcher Serie gibt es die Schattenwelt „Upside Down“?|Stranger Things
Wie heißt die gelbe Zeichentrickfamilie aus Springfield?|Die Simpsons
`;

const DDF_QUESTIONS_FINAL = String.raw`
# Finale – schwerer
Wer war der zweite Bundeskanzler der Bundesrepublik Deutschland?|Ludwig Erhard
Welche Stadt wird auch „die Ewige Stadt“ genannt?|Rom
Welches Obst trägt den Spitznamen „Königin der Früchte“?|Mangostane / Mangostan
Wie heißt die Hauptstadt von Lettland?|Riga
Wie heißt die Hauptstadt von Litauen?|Vilnius
Wie heißt die Hauptstadt von Estland?|Tallinn
Wie heißt die Hauptstadt von Bulgarien?|Sofia
Wie heißt die Hauptstadt von Serbien?|Belgrad
Wie heißt die Hauptstadt der Slowakei?|Bratislava
Wie heißt die Hauptstadt von Marokko?|Rabat
Wie heißt die Hauptstadt von Vietnam?|Hanoi
Wie heißt die Hauptstadt von Kolumbien?|Bogotá
Wie heißt die Hauptstadt von Pakistan?|Islamabad
Wie heißt die Hauptstadt von Nigeria?|Abuja
Wie heißt die Hauptstadt von Kasachstan?|Astana
Wie heißt die Hauptstadt von Albanien?|Tirana
Mit welchem Football-Superstar war Gisele Bündchen verheiratet?|Tom Brady
Welches Sternzeichen hat man, wenn man am 4. August Geburtstag hat?|Löwe
Welches Sternzeichen hat man, wenn man am 1. Januar Geburtstag hat?|Steinbock
Wofür steht die Abkürzung „NSFW“?|Not safe for work
Wofür steht die Abkürzung „ASAP“?|As soon as possible
Wofür steht die Abkürzung „NASA“?|National Aeronautics and Space Administration
Wofür steht die Abkürzung „HTTP“?|Hypertext Transfer Protocol
Wofür steht „AFK“ beim Zocken?|Away from keyboard
Wie heißt die Erbsubstanz DNS ausgeschrieben?|Desoxyribonukleinsäure
Wie viele Hauptarten von Zebras gibt es?|3|S
Wie viele Knochen hat ein erwachsener Mensch?|206|S
Wie hoch ist die Zugspitze?|2962 Meter|S
Wie hoch ist der Mount Everest?|8849 Meter|S
Wie viel Prozent der Erdoberfläche sind ungefähr mit Wasser bedeckt?|71 Prozent|S
Wie viele Minuten braucht das Licht ungefähr von der Sonne bis zur Erde?|Etwa 8 Minuten|S
Wie viele Einwohner hat Deutschland ungefähr?|Rund 83 Millionen|S
Wie viele Tasten hat ein klassisches Klavier?|88|S
In welchem Jahr wurde die Bundesrepublik Deutschland gegründet?|1949
In welchem Jahr sank die Titanic?|1912
In welchem Jahr begann der Erste Weltkrieg?|1914
In welchem Jahr kam das erste iPhone auf den Markt?|2007
In welchem Jahr wurde Google gegründet?|1998
Wer war der erste Mensch im Weltall?|Juri Gagarin
Wie heißt der längste Fluss Europas?|Wolga
Wie heißt der tiefste See der Welt?|Baikalsee
Wie heißt der kleinste Staat der Welt?|Vatikanstadt
Welches Land hat mit seinen Überseegebieten die meisten Zeitzonen?|Frankreich
Wie heißt der höchste Wasserfall der Welt?|Salto Ángel / Angel Falls
Welches Land hat die meisten Pyramiden?|Sudan
Welcher Planet hat die meisten bekannten Monde?|Saturn
Wie heißt der größte Mond des Saturn?|Titan
Wie heißt der größte Mond in unserem Sonnensystem?|Ganymed
Welcher Planet rollt quasi auf der Seite liegend um die Sonne?|Uranus
Welches Element hat das chemische Symbol „Na“?|Natrium
Welches Element hat das chemische Symbol „K“?|Kalium
Welches Element hat das chemische Symbol „Pb“?|Blei
Wie heißt das härteste natürliche Material?|Diamant
Welches Organ produziert Insulin?|Bauchspeicheldrüse
Wie viele Mägen hat eine Kuh?|Vier (einen Magen mit vier Kammern)
Welche Farbe hat der Flugschreiber („Black Box“) in Flugzeugen wirklich?|Orange
Ist die Gurke botanisch gesehen eine Beere?|Ja
Ist die Erdbeere botanisch gesehen eine Beere?|Nein (eine Sammelnussfrucht)
Wer malte „Der Schrei“?|Edvard Munch
Wer bemalte die Decke der Sixtinischen Kapelle?|Michelangelo
Wer schrieb „Die Verwandlung“, in der ein Mann zum Käfer wird?|Franz Kafka
Wer schrieb den Roman „Der Zauberberg“?|Thomas Mann
Wer führte Regie bei „Jurassic Park“?|Steven Spielberg
Aus welchem Disney-Film stammt der Song „Circle of Life“?|Der König der Löwen
Wie heißt der Glücksdrache in „Die unendliche Geschichte“?|Fuchur
Wer gilt als Erfinder des World Wide Web?|Tim Berners-Lee
Nach welcher Komikertruppe ist die Programmiersprache Python benannt?|Monty Python
In welchem Land wurde das Spiel Tetris erfunden?|Sowjetunion / Russland
Welches ist das meistverkaufte Videospiel aller Zeiten?|Minecraft
Welches Land gewann 1930 die erste Fußball-Weltmeisterschaft?|Uruguay
In welcher deutschen Stadt fanden 1972 die Olympischen Sommerspiele statt?|München
Wie viele Spieler hat eine Rugby-Union-Mannschaft auf dem Feld?|15
Wie viele Punkte ist die schwarze Kugel beim Snooker wert?|7
Wie viele Spieler stehen beim Baseball in der Verteidigung auf dem Feld?|9
Welcher Fußballer hat die meisten Ballon-d'Or-Trophäen gewonnen?|Lionel Messi
Was bedeutet „carpe diem“?|Nutze den Tag
Wie nennt man die Angst vor Spinnen?|Arachnophobie
Wie heißt der teuerste Speisepilz der Welt?|Trüffel
Wie heißt der giftige Kugelfisch, der in Japan als Delikatesse gilt?|Fugu
Welches Kraut ist die Hauptzutat von Pesto Genovese?|Basilikum
Was ist die Hauptzutat des schottischen Gerichts Haggis?|Schafsinnereien
Wie viele Sinfonien hat Beethoven komponiert?|9
Wer komponierte die Oper „Die Zauberflöte“?|Wolfgang Amadeus Mozart
Wie alt wurde Mozart?|35 Jahre
Wie heißt der Erzfeind von Sherlock Holmes?|Professor Moriarty
Wie heißt das Schiff von Captain Jack Sparrow?|Black Pearl
In welcher Stadt spielt die Serie „Breaking Bad“?|Albuquerque
An wie viele Länder grenzt Deutschland?|9
Wie viele Bundesländer hat Österreich?|9
Wie viele Kantone hat die Schweiz?|26
Wie viele Mitgliedstaaten hat die Europäische Union?|27
Welcher Ozean ist der kleinste?|Arktischer Ozean / Nordpolarmeer
In welcher Stadt steht die Sagrada Família?|Barcelona
In welcher Stadt steht das Taj Mahal?|Agra
In welchem Land liegt die Felsenstadt Petra?|Jordanien
Welche Währung hat Polen?|Złoty
Wer bekam als erste Frau einen Nobelpreis?|Marie Curie
Wer erhielt 1876 das Patent auf das Telefon?|Alexander Graham Bell
Wie heißt der griechische Gott des Meeres?|Poseidon
Welches Tier ist im Logo von Lamborghini?|Stier
Was misst die Richterskala?|Die Stärke von Erdbeben
`;

/* Flaggen-Fragen: Code -> Land (Zeichnung in flags.js) */
const DDF_FLAG_QUESTIONS = [
  ['de', 'Deutschland'], ['fr', 'Frankreich'], ['it', 'Italien'], ['ie', 'Irland'],
  ['be', 'Belgien'], ['nl', 'Niederlande'], ['lu', 'Luxemburg'], ['at', 'Österreich'],
  ['pl', 'Polen'], ['ua', 'Ukraine'], ['ru', 'Russland'], ['hu', 'Ungarn'],
  ['bg', 'Bulgarien'], ['lt', 'Litauen'], ['ee', 'Estland'], ['ro', 'Rumänien'],
  ['jp', 'Japan'], ['fi', 'Finnland'], ['se', 'Schweden'], ['dk', 'Dänemark'],
  ['no', 'Norwegen'], ['is', 'Island'], ['ch', 'Schweiz'], ['co', 'Kolumbien'],
  ['ng', 'Nigeria'], ['th', 'Thailand'], ['lv', 'Lettland'], ['cz', 'Tschechien'],
  ['gr', 'Griechenland'], ['bd', 'Bangladesch'], ['ml', 'Mali'], ['ar', 'Argentinien']
];
