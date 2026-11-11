/* Spanish language pack (es) for Pick My Secret Santa.
   SPEC-SS-AMIGO-01 (Addendum 2064), shipped as Addendum 2156.
   Translations: the audited prep pack (amigo-prep-2026-11-07),
   plus build-lane translations for surfaces that landed after
   the prep (keys under mine.*). Placeholders {name} {got}
   {group} {budget} {url} {n} {total} {count} {date} {opened}
   {seen} {names} {sent} {i} {a} {b} {kids} {adults} are runtime
   values. Plural pairs use the pack convention: "one | many".
   Loaded only when the page resolves to Spanish; English is
   the literal fallback at every call site in app.js. */
"use strict";
window.SS_ES = {
 "brand.site_name": "Pick My Secret Santa",
 "brand.game_name_es": "amigo secreto",
 "brand.footer_credit": "Built with Muse.",
 "brand.footer_questions": "Preguntas: hello@pickmysecretsanta.com",
 "brand.footer_privacy": "Privacidad",
 "brand.footer_terms": "Términos",
 "home.page_title": "Generador de Amigo Secreto Gratis, Pick My Secret Santa: Sortea los Nombres en Secreto",
 "home.h1": "Sortea los nombres del amigo secreto en secreto.",
 "home.subline": "Gratis, sin registro. Agrega los nombres y un presupuesto. Toma unos 2 minutos.",
 "home.countdown_label": "Cuenta regresiva para Navidad, viernes 25 de diciembre de 2026.",
 "home.countdown_days": "días",
 "home.countdown_hrs": "h",
 "home.countdown_min": "min",
 "home.countdown_sec": "s",
 "home.whats_next": "¿Qué sigue?",
 "home.buy_by_date": "Fecha para comprar: una semana antes del día del intercambio.",
 "home.start_draw_cta": "Empezar el sorteo",
 "home.how_it_works_title": "Cómo funciona",
 "home.how_it_works_line": "Agrega los nombres y un presupuesto. Toca Sortear. Envía a cada persona su enlace privado.",
 "home.run_step_by_step": "Hazlo paso a paso",
 "home.gift_ideas_title": "Seis ideas de regalo para cada persona",
 "home.gift_ideas_line": "De 212 opciones reales revisadas. Todas se ajustan a tu presupuesto.",
 "home.gift_ideas_teens": "Ideas de regalo para adolescentes",
 "home.gift_ideas_funny": "Ideas de regalo divertidas",
 "home.common_questions_title": "Preguntas frecuentes",
 "home.honesty_line": "Tu pantalla muestra solo los nombres y los enlaces. Nunca muestra quién le tocó a quién. Un enlace está oculto a simple vista, no bajo llave.",
 "home.faq_link_organizer_see": "¿El organizador puede ver quién le tocó a quién?",
 "home.faq_link_how_many": "¿Cuántas personas se necesitan?",
 "home.faq_link_add_after": "Agregar a alguien después del sorteo",
 "home.faq_link_lost_link": "Enlace perdido o reenviar un enlace",
 "home.faq_link_pairs_apart": "Mantener separadas a ciertas parejas",
 "home.faq_link_how_works": "¿Cómo funciona el amigo secreto?",
 "home.faq_link_draw_online": "Sortear nombres en línea",
 "home.swap_teaser_title": "El día del intercambio",
 "home.swap_teaser_line": "Elige un juego para revelar: Adivina primero, Tres pistas, Revienta el globo. Tu enlace muestra cinco juegos más el día del intercambio.",
 "home.maker_title": "Hecho por un papá, en su tiempo libre",
 "home.maker_line": "Soy Billy, un papá en Redmond. Creo estas herramientas en mi tiempo libre, con IA.",
 "home.what_we_dont_do_title": "Lo que no hacemos",
 "home.what_we_dont_do_1": "El sorteo se hace en tu navegador. Nuestro servidor guarda los nombres y las asignaciones para los enlaces cortos, de una forma que podemos leer.",
 "home.what_we_dont_do_2": "Tú envías cada enlace privado. Cada enlace muestra una sola asignación.",
 "home.what_we_dont_do_3": "No vendemos regalos ni nos quedamos con ninguna comisión.",
 "sample.badge": "Sorteo de muestra, no es uno real",
 "sample.title": "Prueba un sorteo de muestra",
 "sample.line": "Entran cuatro amigos. Salen cuatro enlaces privados.",
 "sample.sealed_line": "Cada asignación se muestra solo por medio de su propio enlace. Tu pantalla muestra los nombres y los enlaces, nunca quién le tocó a quién.",
 "sample.run_again": "Hacerlo otra vez",
 "sample.sent_count": "{sent} de {total} enlaces enviados",
 "sample.start_from_sample": "Empezar con la muestra",
 "sample.draft_note": "Toca un nombre para hacerlo tuyo. No se sortea nada hasta que tú lo digas.",
 "sample.private_link_sent": "Enlace privado enviado",
 "sample.inside_link": "Dentro del enlace de {name}, solo {name} ve esto",
 "sample.hi_you_got": "Hola, {name}. Te tocó:",
 "sample.one_of_six": "Una de las seis ideas de regalo en su enlace:",
 "sample.starting_from_sample": "A partir de la muestra.",
 "sample.draft_explainer": "Estos cuatro nombres son un borrador: toca cualquier nombre y escribe encima, toca × para quitar uno, o agrega los tuyos abajo. No se sortea nada hasta que toques Sortear.",
 "step1.step_label": "Paso 1 de 3",
 "step1.title_own_draw": "Haz tu propio sorteo",
 "step1.warm_prefill_note": "Nombre y presupuesto vienen del sorteo en el que estabas. Cambia lo que quieras. Nadie verá quién le tocó a quién, igual que en el tuyo.",
 "step1.warm_title_group": "Hazlo para {group}, o para cualquier grupo.",
 "step1.warm_title_plain": "Ahora te toca organizar el sorteo a ti.",
 "step1.group_heading": "Tu grupo",
 "step1.group_name_label": "Nombre del grupo (opcional)",
 "step1.budget_label": "Presupuesto del regalo",
 "step1.next_add_names": "Siguiente: agregar los nombres",
 "step1.first_time": "¿Primera vez?",
 "step1.see_how_it_works": "Mira cómo funciona.",
 "step2.step_label": "Paso 2 de 3",
 "step2.title": "¿Quiénes participan?",
 "step2.person_name_placeholder": "Nombre",
 "step2.person_name_aria": "Nombre de la persona",
 "step2.remove_person_aria": "Quitar a esta persona",
 "step2.optional_details_aria": "Datos opcionales de esta persona",
 "step2.optional_details_label": "Agregar gustos o una nota de deseos",
 "step2.optional_details_label_set": "Gustos o nota de deseos agregados, toca para cambiar",
 "step2.interest_placeholder": "¿Qué le gusta? (opcional)",
 "step2.interest_aria": "Lo que le gusta (opcional)",
 "step2.wish_placeholder": "Nota de deseos para su amigo secreto (opcional)",
 "step2.wish_aria": "Nota de deseos para su amigo secreto (opcional)",
 "step2.add_person": "+ Agregar a una persona",
 "step2.people_count": "{n} personas agregadas. Ya puedes sortear, o primero define las parejas que deben quedar separadas.",
 "step2.min_names_error": "Agrega al menos tres nombres. ¿Dos personas se llaman igual? Agrega la inicial del apellido.",
 "step2.max_people_error": "Treinta personas es el máximo para un sorteo.",
 "step2.dupe_names_error": "Dos personas se llaman igual. Agrega la inicial del apellido a cada una para que cada enlace privado funcione.",
 "step2.wish_privacy_note": "Las notas de deseos se quedan en este dispositivo y nunca van en los enlaces. Una nota solo aparece cuando el amigo secreto abre su enlace en este dispositivo.",
 "step2.back": "Atrás",
 "step2.next_restrictions": "Siguiente: quiénes no deben salir sorteados entre sí",
 "step2.draw_now": "Sortear los nombres ahora",
 "step2.paste_instead": "Pegar una lista en su lugar",
 "step2.paste_title": "Pega los nombres, uno por línea",
 "step2.paste_help": "Solo los nombres está bien: uno por línea, o en una sola línea separados por comas. Para agregar un gusto, ponlo solo después del primer nombre: María, cocina. Después puede ir una nota de deseos.",
 "step2.paste_add": "Agregar a estas personas",
 "step2.close": "Cerrar",
 "step2.type_one_by_one": "o escríbelos uno por uno",
 "step2.or_pick_file": "O elige un archivo de lista (.csv o .txt)",
 "step2.bulk_no_names": "No se encontraron nombres. Pega un nombre por línea.",
 "step2.bulk_paste_first": "Primero pega los nombres, uno por línea.",
 "step2.bulk_added_one": "Se agregó 1 persona.",
 "step2.bulk_added_many": "Se agregaron {n} personas.",
 "step2.bulk_unknown_interest": "{n} nombre tenía un gusto que no conocemos. Se agregó sin gusto. | {n} nombres tenían un gusto que no conocemos. Se agregaron sin gusto.",
 "step2.bulk_skipped_noname": "{n} línea se omitió. Cada línea necesita primero un nombre. | {n} líneas se omitieron. Cada línea necesita primero un nombre.",
 "step2.bulk_skipped_dupe": "{n} línea se omitió, es una copia exacta de una línea de arriba. | {n} líneas se omitieron, son copias exactas de una línea de arriba.",
 "step2.bulk_skipped_over_limit": "{n} línea se omitió, supera el límite de 30 personas. | {n} líneas se omitieron, superan el límite de 30 personas.",
 "step2.bulk_dupe_warning": "Dos personas se llaman igual. Revisa cada enlace dos veces.",
 "gift_finder_on_surface.title": "Describe a una persona. Recibe seis ideas de regalo.",
 "gift_finder_on_surface.prompt_label": "Cuenta qué le gusta, con tus palabras",
 "gift_finder_on_surface.one_at_a_time": "Una persona a la vez, en palabras simples.",
 "gift_finder_on_surface.example_1": "Le encanta la parrilla y la comida picante",
 "gift_finder_on_surface.example_2": "Corre por senderos y acampa al aire libre",
 "gift_finder_on_surface.example_3": "Lee novelas en un sillón grande y cómodo",
 "gift_finder_on_surface.interest_question": "¿Qué le gusta?",
 "gift_finder_on_surface.budget_for_picks": "Presupuesto para estas ideas",
 "gift_finder_on_surface.budget_u25": "Menos de $25",
 "gift_finder_on_surface.budget_2550": "$25-$50",
 "gift_finder_on_surface.budget_50100": "$50-$100",
 "gift_finder_on_surface.budget_100plus": "$100+",
 "gift_finder_on_surface.find_ideas": "Buscar seis ideas de regalo",
 "gift_finder_on_surface.no_name_needed": "No necesitas ningún nombre. Se busca en este dispositivo: no se envía ni se guarda nada.",
 "gift_finder_on_surface.no_name_needed_ask": "Aquí no necesitas ningún nombre.",
 "gift_finder_on_surface.ask_privacy_note": "Tus palabras van a la IA de este sitio, que las lee y elige de la lista de regalos del sitio. Nada de lo que escribas se guarda.",
 "gift_finder_on_surface.one_moment": "Un momento...",
 "gift_finder_on_surface.matched_your_words": "Seis ideas coinciden con tus palabras.",
 "gift_finder_on_surface.matched_rest": "{n} idea coincide con tus palabras. Las demás se ajustan a tu presupuesto: | {n} ideas coinciden con tus palabras. Las demás se ajustan a tu presupuesto:",
 "gift_finder_on_surface.no_match": "Tus palabras no coinciden con ningún gusto conocido.",
 "gift_finder_on_surface.here_are_six": "Aquí tienes seis ideas que se ajustan a tu presupuesto:",
 "gift_finder_on_surface.like_these_hint": "¿Te gustan estas ideas? Define ese gusto en su fila, arriba. Su enlace privado llevará ideas como estas.",
 "gift_finder_on_surface.or_pick_interest_hint": "O elige un gusto en su fila, arriba. Su enlace privado llevará ideas para ese gusto.",
 "gift_finder_on_surface.practical_fallback_category": "Práctico, no necesita un gusto",
 "step3.step_label": "Paso 3 de 3",
 "step3.title": "Quiénes no deben salir sorteados entre sí (opcional)",
 "step3.help": "Toca un nombre. Luego toca a todas las personas que no deben regalarle. Funciona en ambos sentidos.",
 "step3.must_not_draw": "{name} no debe regalarle a:",
 "step3.now_tap_other": "Ahora toca a la otra persona. La pareja quedará separada.",
 "step3.quick_ways": "Formas rápidas de agregar reglas",
 "step3.couples_apart": "Parejas separadas",
 "step3.couples_apart_help_first": "Toca a la primera persona de una pareja.",
 "step3.last_year_pairs": "Las parejas del año pasado",
 "step3.last_year_help_first": "Toca a la primera de dos personas que se regalaron el año pasado.",
 "step3.kids_adults_apart": "Niños y adultos separados",
 "step3.kids_adults_help": "Toca a cada niño. Quien no quede marcado cuenta como adulto.",
 "step3.kids_adults_on": "Activado: ningún niño le regala a un adulto, y ningún adulto le regala a un niño. Toca un nombre para corregir una etiqueta.",
 "step3.kids_adults_adds": "Separar niños y adultos agrega {n} parejas separadas.",
 "step3.kids_adults_all_kids_error": "Todos los nombres están marcados como niños: deja al menos un adulto sin marcar.",
 "step3.kids_count_line": "{kids} niños · {adults} adultos. Toca un nombre para cambiarlo. | (see GAPS: source concatenates counts + fix instruction)",
 "step3.clear_all_rules": "Borrar todas las reglas",
 "step3.pairs_count_none": "Ninguna pareja separada todavía.",
 "step3.pairs_count": "{n} pareja separada. | {n} parejas separadas.",
 "step3.remove_pair_aria": "Quitar la regla que separa a {a} y {b}",
 "step3.pair_conflict_kids_note": "Esa pareja ya queda separada por la regla de niños y adultos separados. Cámbiala con ese botón, abajo.",
 "step3.three_person_warning": "Con tres personas, una asignación revela las demás.",
 "step3.four_person_warning": "Con cuatro personas y parejas separadas, una asignación puede revelar otra.",
 "step3.questions_prompt": "¿Preguntas?",
 "step3.see_questions_below": "Mira las preguntas de abajo.",
 "step3.back": "Atrás",
 "step3.draw_cta": "Sortear los nombres",
 "step3.no_fair_draw_error": "Ningún sorteo justo cumple estas reglas. Quita una o dos parejas separadas e inténtalo de nuevo.",
 "step3.no_fair_draw_small_error": "Ningún sorteo justo cumple estas reglas. Los grupos pequeños son frágiles: con {n} personas, cada una tiene solo {m} nombres posibles, y las parejas separadas bloquean demasiados. Quita una pareja separada, o agrega una persona, e inténtalo de nuevo.",
 "share.done_title": "Listo: tu sorteo está preparado",
 "share.send_each_link": "Envía cada enlace privado.",
 "share.you_see_never_matches": "Tú ves los nombres y los enlaces. Nunca las asignaciones.",
 "share.draw_summary": "{group} · {n} personas · Presupuesto: {budget}",
 "share.for_person": "Para {name}",
 "share.private_link_ready": "Enlace privado listo: envíaselo solo a {name}.",
 "share.copy_link": "Copiar enlace",
 "share.copy_message": "Copiar mensaje",
 "share.share": "Compartir",
 "share.copied": "Copiado",
 "share.shared_from_device": "Compartido desde este dispositivo ✓",
 "share.still_to_send": "Falta enviar: {names}",
 "share.links_shared_count": "{n} enlaces compartidos desde este dispositivo.",
 "share.every_link_shared": "Todos los enlaces ya se compartieron desde este dispositivo.",
 "share.sends_only_note": "Esta barra cuenta solo los envíos. Quiénes ya abrieron su enlace está en la lista de abajo.",
 "share.dupe_warning": "Dos personas se llaman igual. Revisa cada enlace dos veces.",
 "share.redraw_warning": "Los enlaces nuevos reemplazarán a estos. Los enlaces que ya enviaste siguen funcionando y muestran el sorteo anterior. Envía solo el juego nuevo.",
 "share.late_joiner_prompt": "¿Alguien se suma tarde?",
 "share.late_joiner_link": "Mira las dos formas de agregarlo.",
 "share.group_message_cta": "Copiar un mensaje para todo el grupo",
 "share.group_message_help": "Envía primero ese mensaje al chat del grupo. Avisa el presupuesto y las reglas.",
 "share.forgot_step_prompt": "¿Olvidaste un paso?",
 "share.check_how_it_works": "Revisa cómo funciona.",
 "share.links_are_keys": "Estos enlaces funcionan como llaves. Quien tenga un enlace puede ver la asignación de esa persona. Envía cada enlace en privado.",
 "share.draw_sealed": "Sorteo listo.",
 "share.receipt_share_line": "Comparte este comprobante con todo tu grupo. Incluye el grupo, el presupuesto y las reglas que siguió el sorteo. No muestra ninguna asignación ni ningún enlace.",
 "share.links_saved_note": "Enlaces guardados en este dispositivo. Vuelve cuando quieras para reenviar uno.",
 "share.draw_again": "Sortear de nuevo",
 "share.start_over": "Empezar de cero",
 "share.copy_prompt_fallback": "Copia este enlace:",
 "share.kit_headline": "Tu sorteo está listo. Envía a cada persona su enlace privado de asignación.",
 "share.kit_explainer": "Un enlace para una persona. Quien lo abra ve su asignación. Envíalo solo a esa persona.",
 "share.confirm_copied": "Enlace de {name} copiado — envíalo solo a {name}.",
 "share.confirm_shared": "Enlace de {name} compartido — envíalo solo a {name}.",
 "share.confirm_whatsapp": "WhatsApp abierto con el enlace de {name} — envíalo solo a {name}.",
 "share.confirm_sms": "SMS abierto con el enlace de {name} — envíalo solo a {name}.",
 "share.group_no_links": "El mensaje para el grupo no tiene enlaces de asignaciones.",
 "share.share_group": "Compartir con el grupo",
 "messages.group_share_with_group": "¡El sorteo de amigo secreto de {group} ya está listo! Estén atentos a sus mensajes: le enviaré a cada quien un enlace privado para ver a quién le tocó.",
 "messages.group_share_no_group": "¡Nuestro sorteo de amigo secreto ya está listo! Estén atentos a sus mensajes: le enviaré a cada quien un enlace privado para ver a quién le tocó.",
 "messages.per_person_with_group": "Estás en el amigo secreto de {group}, presupuesto {budget}. Toca tu enlace privado para ver a quién te tocó regalarle: {url} Sin registro. Tu organizador no ve tu asignación en su pantalla: se muestra solo por medio de este enlace. No reenvíes el enlace: quien lo tenga puede abrirlo.",
 "messages.per_person_no_group": "Estás en un sorteo de amigo secreto, presupuesto {budget}. Toca tu enlace privado para ver a quién te tocó regalarle: {url} Sin registro. Tu organizador no ve tu asignación en su pantalla: se muestra solo por medio de este enlace. No reenvíes el enlace: quien lo tenga puede abrirlo.",
 "messages.group_message_with_group": "El sorteo de amigo secreto de {group} ya está hecho, presupuesto {budget}. Estén atentos a sus mensajes: le enviaré a cada quien su enlace privado. Tu enlace muestra solo tu asignación; mi pantalla nunca muestra a quién te tocó. Guarda tu enlace en secreto y no lo reenvíes: quien lo tenga puede abrirlo. ¿Quieres organizar uno para tu oficina o tu familia? La misma herramienta gratis, 2 minutos, sin registro, y ninguna pantalla muestra las asignaciones: pickmysecretsanta.com/?via=group",
 "messages.group_message_no_group": "Nuestro sorteo de amigo secreto ya está hecho, presupuesto {budget}. Estén atentos a sus mensajes: le enviaré a cada quien su enlace privado. Tu enlace muestra solo tu asignación; mi pantalla nunca muestra a quién te tocó. Guarda tu enlace en secreto y no lo reenvíes: quien lo tenga puede abrirlo. ¿Quieres organizar uno para tu oficina o tu familia? La misma herramienta gratis, 2 minutos, sin registro, y ninguna pantalla muestra las asignaciones: pickmysecretsanta.com/?via=group",
 "messages.group_message_card_label": "Para el chat del grupo",
 "messages.group_message_preview": "Una nota lista para tu chat de grupo: el sorteo ya está hecho y a cada persona le llegará su enlace privado.",
 "messages.copy_group_message": "Copiar el mensaje del grupo",
 "messages.share_sheet_title": "Amigo secreto",
 "messages.nudge": "Hola, {name}, un recordatorio amistoso de tu organizador de amigo secreto. Tu enlace privado sigue sin abrir: {url} Tócalo para ver a quién te tocó (presupuesto {budget}). Toma diez segundos, y mi pantalla nunca muestra tu asignación.",
 "messages.copy_nudge_for": "Copiar un recordatorio para {name}",
 "receipt.title_line": "Pick My Secret Santa, sorteo listo",
 "receipt.image_subtitle": "sorteo listo",
 "receipt.group_line": "Grupo: {group}",
 "receipt.drawn_on": "Sorteado el {date}.",
 "receipt.people_line": "{n} personas: {names}.",
 "receipt.budget_line": "Presupuesto: {budget}.",
 "receipt.pairs_honored_one": "1 pareja quedó separada. Todas las parejas se respetaron.",
 "receipt.pairs_honored_many": "{n} parejas quedaron separadas. Todas las parejas se respetaron.",
 "receipt.pairs_none": "Ninguna pareja quedó separada.",
 "receipt.no_self_draw": "Nadie se sacó a sí mismo.",
 "receipt.shows_no_matches": "Este comprobante no muestra ninguna asignación.",
 "receipt.each_match_in_link": "Cada asignación se muestra solo por medio de su propio enlace privado.",
 "receipt.run_your_own": "Haz tu propio sorteo en pickmysecretsanta.com, gratis, sin registro.",
 "receipt.copy_receipt": "Copiar comprobante",
 "receipt.save_receipt_picture": "Guardar la imagen del comprobante",
 "receipt.image_filename": "amigo-secreto-sorteo-sellado.png",
 "manage_card_on_share.label": "Tu enlace del grupo",
 "manage_card_on_share.line": "Administra este sorteo desde cualquier dispositivo, quiénes ya abrieron su enlace, recordatorios, el comprobante:",
 "manage_card_on_share.copy_manage_link": "Copiar enlace de administración",
 "manage_card_on_share.open_manage_page": "Abrir la página de administración",
 "manage_card_on_share.bookmark_warning": "Guárdalo en favoritos o consérvalo: quien tenga este enlace puede administrar el sorteo. Cuídalo como una contraseña.",
 "manage_card_on_share.get_new_manage_link": "Obtener un enlace de administración nuevo",
 "manage_card_on_share.get_new_manage_link_armed": "Toca de nuevo, el enlace anterior dejará de funcionar pronto",
 "saved_draw.welcome_back": "Qué bueno verte de nuevo.",
 "saved_draw.new_group_line": "Haz un sorteo nuevo para un grupo nuevo.",
 "saved_draw.start_new_draw": "Empezar un sorteo nuevo",
 "saved_draw.your_saved_draw": "Tu sorteo guardado",
 "saved_draw.show_links": "Ver los enlaces de todos",
 "saved_draw.hide_links": "Ocultar los enlaces de todos",
 "saved_draw.saved_line": "Tu último sorteo está guardado en este dispositivo.",
 "saved_draw.saved_help": "Reenvía un enlace o comparte el comprobante.",
 "saved_draw.run_it_back": "Repetirlo con el mismo grupo",
 "saved_draw.run_it_back_card": "Repetirlo con este grupo",
 "saved_draw.run_it_back_note": "Empieza un sorteo nuevo con los mismos nombres y presupuesto, ya completados en este dispositivo.",
 "saved_draw.on_device_only": "Guardado solo en este dispositivo. Nada se envió a un servidor.",
 "saved_draw.shared_device_warning": "Cualquiera que use este dispositivo puede abrir los enlaces. Borra el sorteo si es un dispositivo compartido.",
 "saved_draw.clear_draw": "Borrar el sorteo guardado de este dispositivo",
 "saved_draw.clear_draw_armed": "Toca de nuevo para borrarlo para siempre",
 "saved_draw.cleared_note": "Sorteo guardado borrado. Los enlaces que ya enviaste siguen funcionando.",
 "saved_draw.prefill_last_group": "Tu último grupo, ya completado: nombres, grupo y presupuesto. Cambia lo que quieras y sortea.",
 "saved_draw.prefill_from_draw": "Completado con el sorteo en el que estabas, los mismos nombres, grupo y presupuesto. Cambia lo que quieras y sortea.",
 "saved_draw.prefill_two_names": "Dos nombres completados con el enlace que abriste. Agrega al resto de tu grupo y sortea.",
 "reveal.cover_ready": "Tu asignación secreta está lista.",
 "reveal.cover_for_you": "Este es para ti.",
 "reveal.cover_line": "Este enlace es para {name}.",
 "reveal.cover_budget": "Presupuesto: {budget}",
 "reveal.opening_link": "Abriendo tu enlace privado…",
 "reveal.peek_cta": "Toca para abrir tu regalo",
 "reveal.hi_you_got": "Hola, {name}. Te tocó regalarle a:",
 "reveal.got_name_fallback": "Hola, {name}. Te tocó:",
 "reveal.budget_line": "Presupuesto: {budget}",
 "reveal.their_wishlist": "Su lista de deseos",
 "reveal.wishlist_device_note": "Tu organizador guardó esta nota en este dispositivo. Nunca se envió a ningún lado y no está en tu enlace.",
 "reveal.all_gift_ideas": "Todas tus ideas de regalo",
 "reveal.gift_ideas_help": "Toca «Siguiente idea de regalo» en la tarjeta de arriba para ver todos los detalles.",
 "reveal.gift_door_more": "Más ideas de {interest} →",
 "reveal.see_another_idea": "Siguiente idea de regalo",
 "reveal.what_to_look_for": "Qué buscar",
 "reveal.show_more_ideas": "Ver {n} ideas de regalo más",
 "reveal.show_fewer_ideas": "Ver menos ideas de regalo",
 "reveal.gift_idea_counter": "Idea de regalo {i} de {total}.",
 "reveal.gift_idea_category_fallback": "Idea de regalo",
 "reveal.save_match_card": "Guardar mi tarjeta",
 "reveal.match_card_filename": "mi-tarjeta-de-amigo-secreto.png",
 "reveal.keep_it_secret": "Guárdalo en secreto.",
 "reveal.error_title": "Este enlace no funciona.",
 "reveal.error_line": "Pídele a tu organizador uno nuevo.",
 "reveal.error_trust": "Confía solo en un enlace que te haya enviado tu organizador.",
 "handback.want_your_own": "¿Quieres uno para tu grupo?",
 "handback.start_your_own": "Haz tu propio sorteo",
 "handback.line": "Ya viste cómo funciona: tu asignación se mantuvo en secreto, incluso para tu organizador. Organizar el tuyo toma unos 2 minutos.",
 "handback.open_the_draw": "Abrir el sorteo",
 "handback.or_use_inside": ",  o úsalo dentro del sorteo.",
 "stripped_link.title": "A este enlace le falta su parte privada.",
 "stripped_link.body": "Parece que tocaste un enlace de amigo secreto, pero la mitad secreta del enlace no llegó, algunas aplicaciones la cortan. Tu asignación no se perdió: pídele a tu organizador que te vuelva a enviar tu enlace completo y toca el nuevo. En esta página no se muestra nada de tu asignación.",
 "progress.who_opened_title": "Quiénes ya abrieron su enlace",
 "progress.checking": "Consultando…",
 "progress.check_again": "Consultar de nuevo",
 "progress.opened_summary": "{opened} de {total} ya abrieron · {seen} ya vieron a quién les tocó",
 "progress.opened_chip": "Ya abrió",
 "progress.seen_chip": "Ya vio a quién le tocó",
 "progress.not_opened_chip": "Todavía no abre",
 "progress.could_not_check_saved": "No se pudo consultar en este momento. Tus enlaces siguen funcionando: vuelve a intentarlo en un rato.",
 "progress.could_not_check_manage": "No se pudo consultar quiénes abrieron en este momento. Los enlaces de abajo siguen funcionando: vuelve a intentarlo en un rato.",
 "progress.opens_only_note_saved": "Solo aperturas. Esto nunca muestra quién le tocó a quién. Funciona con un código aleatorio: la nota no guarda ningún nombre ni ninguna asignación.",
 "progress.opens_only_note_manage": "Solo aperturas. Esta página nunca muestra quién le tocó a quién: cada asignación se muestra solo por medio del enlace privado de esa persona.",
 "progress.cant_see_who_opened": "No puede ver quién abrió un enlace.",
 "manage_view.aria_label": "Administrar este sorteo",
 "manage_view.opening_group": "Abriendo tu grupo…",
 "manage_view.summary_line": "Sorteado el {date} · {n} personas · Presupuesto: {budget}.",
 "manage_view.your_group_link": "Tu enlace del grupo",
 "manage_view.copy_link_for": "Copiar el enlace de {name}",
 "manage_view.link_revoked_chip": "Enlace revocado",
 "manage_view.revoke_link": "Revocar el enlace de {name}",
 "manage_view.revoke_armed": "Toca de nuevo para revocarlo para siempre",
 "manage_view.back_to_tool": "Volver a la herramienta",
 "manage_view.run_it_back": "Repetirlo con este grupo",
 "manage_view.run_it_back_note": "Empieza un sorteo nuevo con los mismos nombres y presupuesto, ya completados en este dispositivo.",
 "manage_view.bad_link_error": "Este enlace de administración no funciona. Es posible que uno más nuevo lo haya reemplazado: en el dispositivo donde se hizo el sorteo, abre tu sorteo guardado y copia el enlace del grupo actual.",
 "manage_view.bad_link_title": "Este enlace de administración no funciona.",
 "manage_view.bad_link_body": "Es posible que uno más nuevo lo haya reemplazado. En el dispositivo donde se hizo el sorteo, abre tu sorteo guardado y copia el enlace del grupo actual.",
 "recovery.paste_label": "¿Tienes el enlace completo en un mensaje? Pégalo aquí.",
 "recovery.paste_placeholder": "Pega tu enlace completo",
 "recovery.open_my_link": "Abrir mi enlace",
 "recovery.bad_paste": "Ese enlace no funciona: revisa que lo hayas copiado completo.",
 "delivery_and_games_on_reveal.delivery_title": "Entrégalo sin revelar quién eres",
 "delivery_and_games_on_reveal.delivery_help": "Elige la forma que mejor va con tu lugar.",
 "delivery_and_games_on_reveal.delivery_footer": "Para todas las formas: usa papel de envolver sencillo. Imprime la etiqueta. Tu letra te delata.",
 "delivery_and_games_on_reveal.desk_drop_t": "Déjalo en su escritorio.",
 "delivery_and_games_on_reveal.desk_drop_b": "Déjalo en su escritorio antes de que empiece el trabajo. Aléjate antes de que se siente. Funciona mejor si sabes a qué hora llega.",
 "delivery_and_games_on_reveal.doorstep_drop_t": "Déjalo en su puerta.",
 "delivery_and_games_on_reveal.doorstep_drop_b": "Deja el regalo en la puerta de su casa. Toca una vez y aléjate rápido. ¿Va a llover? Déjalo primero bajo techo.",
 "delivery_and_games_on_reveal.front_desk_t": "Déjalo en recepción.",
 "delivery_and_games_on_reveal.front_desk_b": "Déjalo en recepción o en la sala de correo. Pide al personal que se lo entregue más tarde. Pon solo su nombre en la etiqueta.",
 "delivery_and_games_on_reveal.helper_t": "Entrega con ayuda.",
 "delivery_and_games_on_reveal.helper_b": "Pídele a un amigo que no participa en el juego que lo entregue. Solo dirá una frase: esto es para ti. Elige a alguien que no revele tu nombre.",
 "delivery_and_games_on_reveal.locker_t": "Escóndelo en su casillero.",
 "delivery_and_games_on_reveal.locker_b": "Déjalo en su casillero, su cubículo o su cajón. Usa un lugar que abra todos los días. Asegúrate de que nadie más pueda alcanzarlo.",
 "delivery_and_games_on_reveal.mailbox_t": "Sorpresa en el buzón.",
 "delivery_and_games_on_reveal.mailbox_b": "Déjalo en su casillero de correo del trabajo. Agrega una etiqueta que diga: ábrelo después, a solas. Los regalos pequeños y blandos entran mejor así.",
 "delivery_and_games_on_reveal.plain_mail_t": "Caja sencilla por correo.",
 "delivery_and_games_on_reveal.plain_mail_b": "Envíalo en una caja sencilla y resistente. No escribas nombre ni dirección del remitente. Envíalo temprano: el correo se retrasa en temporada de fiestas.",
 "delivery_and_games_on_reveal.clue_trail_t": "Pistas escondidas.",
 "delivery_and_games_on_reveal.clue_trail_b": "Esconde el regalo en un lugar seguro y cercano. Deja una primera pista donde seguro la verá. Cada pista lleva a la siguiente. La última pista lleva al regalo.",
 "delivery_and_games_on_reveal.decoy_t": "Caja señuelo.",
 "delivery_and_games_on_reveal.decoy_b": "Pon el regalo dentro de una caja más grande y graciosa. Envuelve esa caja en papel sencillo. La forma rara esconde lo que hay dentro. Agrega relleno suave para que nada suene.",
 "delivery_and_games_on_reveal.gift_table_t": "Déjalo en la mesa de regalos.",
 "delivery_and_games_on_reveal.gift_table_b": "Ponlo temprano en la mesa de regalos compartida. Llega antes que tu persona. Luego únete al grupo como todos los demás.",
 "delivery_and_games_on_reveal.games_title": "El día del intercambio",
 "delivery_and_games_on_reveal.games_help": "Elige un juego para todo el grupo.",
 "delivery_and_games_on_reveal.guess_first_t": "Adivina primero.",
 "delivery_and_games_on_reveal.guess_first_b": "Abran un regalo a la vez, por turnos. Cada persona primero adivina quién es su amigo secreto. Solo entonces el amigo secreto se revela.",
 "delivery_and_games_on_reveal.tag_clue_t": "Pista en la etiqueta.",
 "delivery_and_games_on_reveal.tag_clue_b": "Escribe una pista en la etiqueta del regalo. Lee la etiqueta en voz alta antes de abrir. El grupo adivina solo con la pista.",
 "delivery_and_games_on_reveal.three_clues_t": "Juego de las tres pistas.",
 "delivery_and_games_on_reveal.three_clues_b": "Cada amigo secreto da tres pistas, una por una. Las pistas empiezan difíciles y se vuelven más fáciles. La persona adivina después de cada pista.",
 "delivery_and_games_on_reveal.note_inside_t": "Nota dentro del papel.",
 "delivery_and_games_on_reveal.note_inside_b": "Esconde una nota firmada dentro del papel de envolver. Tu persona la encuentra mientras abre el regalo. Deja el exterior del regalo en blanco.",
 "delivery_and_games_on_reveal.stand_point_t": "Ponte de pie y señala.",
 "delivery_and_games_on_reveal.stand_point_b": "Después del último regalo, todos los amigos secretos se ponen de pie. Cada persona señala su mejor suposición. Los amigos secretos se sientan cuando alguien acierta.",
 "delivery_and_games_on_reveal.balloon_t": "Revienta el globo.",
 "delivery_and_games_on_reveal.balloon_b": "Pon el nombre de cada amigo secreto dentro de un globo. Cada persona revienta uno después de abrir su regalo. El nombre de adentro revela a su amigo secreto.",
 "delivery_and_games_on_reveal.video_t": "Revelación en video.",
 "delivery_and_games_on_reveal.video_b": "Graba un clip corto antes de la fiesta. Empieza con un sombrero o una máscara. Quítatelo y di tu nombre. Reproduzcan los clips después del último regalo.",
 "delivery_and_games_on_reveal.all_at_once_t": "Todos a la vez.",
 "delivery_and_games_on_reveal.all_at_once_b": "Díganlo todos a la vez después del último regalo. Sin adivinanzas, sin juegos, todos los nombres juntos. Un amigo secreto puede quedarse en secreto si quiere.",
 "faq_in_flow.can_organizer_see_q": "¿El organizador puede ver quién le tocó a quién?",
 "faq_in_flow.can_organizer_see_a": "No en tu pantalla. Tu pantalla muestra los nombres y los enlaces, nunca las asignaciones. Cada asignación se muestra solo por medio de su propio enlace privado. Honestamente: un enlace está oculto a simple vista, no bajo llave. Quien tenga el enlace puede abrirlo, por eso cada enlace se envía en privado, solo a su persona. El sorteo se hace en tu navegador. Para los enlaces cortos, nuestro servidor guarda cada nombre y su asignación de una forma que podemos leer. Guardar así no es cifrar.",
 "faq_in_flow.how_many_q": "¿Cuántas personas se necesitan para el amigo secreto?",
 "faq_in_flow.how_many_a": "Al menos tres. Con tres personas, una asignación revela las demás, y la página te lo avisa. El máximo es 30 personas por sorteo.",
 "faq_in_flow.is_it_free_q": "¿Es gratis? ¿Necesito una cuenta o un correo?",
 "faq_in_flow.is_it_free_a": "Es gratis, sin cuenta y sin correo. No te pedimos ningún correo electrónico, ni a ti ni a quienes participan. Cada persona recibe un enlace privado que tú le envías por donde quieras, por ejemplo, por WhatsApp.",
 "faq_in_flow.how_secret_q": "¿Qué tan secreto es?",
 "faq_in_flow.how_secret_a": "Piensa en una nota en un sobre, no en una caja fuerte. La pantalla de quien organiza nunca muestra las asignaciones. Para que el enlace corto funcione, la asignación se guarda en nuestro servidor junto con los nombres, de una forma que podemos leer. Guardar así no es cifrar, y el enlace no tiene contraseña: quien lo tenga puede abrirlo. Envía cada enlace en privado y no lo reenvíes.",
 "faq_in_flow.lost_link_q": "¿Perdí un enlace? ¿Puedo reenviarlo?",
 "faq_in_flow.lost_link_a": "Sí. Los enlaces quedan guardados en el dispositivo del organizador, así que puede volver en cualquier momento y copiar de nuevo el enlace de cualquier persona. En la vista de administración también puedes copiar el enlace de cada quien y revocar un enlace si fue a parar a manos equivocadas.",
 "faq_in_flow.add_after_q": "¿Puedo agregar a alguien después del sorteo?",
 "faq_in_flow.add_after_a": "Sí, hay dos formas, la página del sorteo te las muestra después de sortear. Los enlaces ya enviados siguen funcionando.",
 "faq_in_flow.pairs_apart_q": "¿Puedo evitar que ciertas personas se regalen entre sí?",
 "faq_in_flow.pairs_apart_a": "Sí. En el paso 3 toca un nombre y luego a todas las personas que no deben regalarle. Funciona en ambos sentidos. También hay atajos: parejas separadas, las parejas del año pasado, y niños y adultos separados.",
 "ai_block_home.title": "Funciona con tu IA",
 "ai_block_home.line": "Tu IA puede elegir entre las 212 ideas de regalo revisadas a mano de este sitio, según tu persona y tu presupuesto. El sorteo secreto en sí se queda aquí, en el sitio.",
 "ai_block_home.connect_line": "Conecta este sitio a Claude, Cursor o cualquier otro cliente MCP. Es gratis y toma alrededor de un minuto.",
 "ai_block_home.step1": "1. Copia la dirección del servidor",
 "ai_block_home.copy": "Copiar",
 "ai_block_home.step2": "2. Agrégala a tu IA",
 "ai_block_home.claude_code_label": "Claude Code, un solo comando",
 "ai_block_home.desktop_label": "Claude Desktop o Cursor, pégala en los ajustes de MCP",
 "ai_block_home.step3": "3. Pregúntale a tu IA:",
 "ai_block_home.example_prompt": "«Necesito un regalo de amigo secreto para un compañero de trabajo al que le encanta el café, por menos de $25.»",
 "ask_entry_points.open_draw": "Abrir el sorteo",
 "ask_entry_points.or_use_inside": ",  o úsalo dentro del sorteo.",
 "ask_entry_points.ask_about_draw": "Pregúntale a la IA sobre tu sorteo",
 "ask_entry_points.chat_title": "Chatea con la IA del Amigo Secreto",
 "ask_entry_points.chat_privacy": "Ayuda con el sorteo y plática de regalos, sin revelar nada. Esta IA no puede ver el sorteo de nadie, es a propósito. Nada de lo que escribas se guarda.",
 "ask_entry_points.chat_greeting": "Hola, soy el asistente de IA del Amigo Secreto. Explico cómo funciona el sorteo, te ayudo a organizar un grupo y hablamos de ideas de regalo.",
 "ask_entry_points.chat_chip_setup": "Organiza un sorteo de amigo secreto para mi grupo",
 "ask_entry_points.chat_chip_organizer_see": "¿El organizador puede ver quién le tocó a quién?",
 "ask_entry_points.send": "Enviar",
 "ask_entry_points.chat_draw_note": "El sorteo en sí se hace en esta página, en tu navegador. Este chat nunca lo ve.",
 "interests.placeholder": "¿Qué le gusta? (opcional)",
 "interests.surprise": "Sorpréndeme",
 "interests.cooking": "Cocina",
 "interests.tech": "Tecnología",
 "interests.outdoors": "Aire libre",
 "interests.games": "Juegos",
 "interests.fitness": "Ejercicio",
 "interests.travel": "Viajes",
 "interests.cozy": "Cosas acogedoras",
 "interests.books": "Libros",
 "interests.science": "Ciencia",
 "interests.music": "Música",
 "interests.gardening": "Jardinería",
 "months.format": "{d} de {month} de {y}",
 "og_and_social.home.og_title": "Pick My Secret Santa",
 "og_and_social.home.og_description": "Alguien hizo un sorteo de amigo secreto, si tu enlace privado está en este chat, tócalo: tu asignación está adentro, y ni quien organizó puede verla. ¿Quieres hacer el tuyo? Gratis, 2 minutos, sin registro.",
 "og_and_social.home.meta_description": "Generador de amigo secreto gratis: sortea los nombres en secreto, en tu navegador. Sin registro. Cada persona recibe un enlace privado e ideas de regalo dentro de tu presupuesto.",
 "og_and_social.amigo_secreto.og_title": "Amigo Secreto Online Gratis, Pick My Secret Santa",
 "og_and_social.amigo_secreto.og_description": "Sorteo de amigo secreto gratis: escribe los nombres, comparte un enlace con tu grupo y cada quien ve solo a quién le tocó. Sin registro, sin correo, sin descargar nada.",
 "og_and_social.amigo_secreto_sin_correo.og_title": "Amigo Secreto sin Correo, Sorteo Online Gratis, Sin Registro | Pick My Secret Santa",
 "og_and_social.amigo_secreto_sin_correo.og_description": "Amigo secreto sin correo ni registro: sortea los nombres en tu navegador, envía un enlace privado a cada persona por WhatsApp y cada quien ve solo a quién le tocó. Gratis, sin descargar nada.",
 "og_and_social.amigo_invisible.og_title": "Amigo Invisible Online Gratis, Pick My Secret Santa",
 "og_and_social.amigo_invisible.og_description": "Sorteo del amigo invisible online y gratis: escribe los nombres, comparte un enlace con tu grupo y cada quien ve solo a quién le tocó. Sin registro, sin correo, sin descargar nada.",
 "mine.group_placeholder": "ej. El grupo de la oficina",
 "mine.organizer_name_label": "Tu primer nombre (opcional)",
 "mine.organizer_name_ph": "ej. María",
 "mine.organizer_name_hint": "Agrégalo y la portada del enlace de cada persona (la primera página que ven al abrir su enlace) dirá quién organizó el sorteo. Déjalo en blanco y las portadas quedan como están.",
 "mine.cover_from": "{name} organizó este sorteo para ti.",
 "mine.fairness_line": "El sorteo es aleatorio. Nadie se saca a sí mismo, y las parejas que separas nunca se regalan entre sí. Tu pantalla mostrará solo nombres y enlaces, nunca las asignaciones. Cada asignación queda detrás de su propio enlace privado.",
 "mine.paste_link_label": "¿Tienes el enlace completo en un mensaje? Pégalo aquí.",
 "mine.paste_link_ph": "Pega tu enlace completo",
 "mine.paste_link_btn": "Abrir mi enlace",
 "mine.paste_link_err": "Ese enlace no funciona: revisa que lo hayas copiado completo.",
 "mine.paste_link_org_hint": "¿Eres el organizador? Tu enlace de administración está en el sorteo guardado en este dispositivo.",
 "mine.sample_open": "Abrir el enlace de muestra de Maya",
 "mine.sample_open_hint": "Esto es una muestra. En un sorteo real, solo Maya puede abrir su enlace.",
 "mine.sample_ready_count": "{sent} de {total} enlaces listos",
 "mine.min_names_hint": "Agrega al menos tres nombres. ¿Dos personas se llaman igual? Agrega la inicial del apellido.",
 "mine.ask_words_ph": "ej. siempre está en el sendero con su perro",
 "mine.bulk_ph": "María, cocina\nSam\nJo, sorpréndeme",
 "mine.rename_btn": "Cambiar el nombre de {name}",
 "mine.rename_aria": "Nombre nuevo para {name}",
 "mine.rename_save": "Guardar el nombre nuevo",
 "mine.rename_cancel": "Cancelar",
 "mine.rename_note": "Esto corrige el nombre en la página de administración y en los enlaces privados que se abran desde este sitio a partir de ahora. Un enlace largo que ya enviaste conserva el nombre anterior: quedó fijado cuando lo enviaste.",
 "mine.rename_err_bad": "Ese nombre no funciona: revísalo e inténtalo de nuevo.",
 "mine.rename_err_save": "Ese nombre no se pudo guardar: puede coincidir con otro nombre del grupo, o no se pudo comprobar el sorteo. Inténtalo de nuevo.",
 "mine.rename_err_conn": "Ese nombre no se pudo guardar: revisa tu conexión e inténtalo de nuevo.",
 "mine.recipient_ask_title": "¿Necesitas más ideas?",
 "mine.another_group_title": "¿También organizas otro grupo?",
 "mine.another_group_line": "Empieza un sorteo nuevo para un grupo distinto: nombres en blanco, con el mismo presupuesto.",
 "mine.another_group_btn": "Empezar un sorteo para otro grupo",
 "mine.legacy_links_title": "Enlaces cortos para este sorteo",
 "mine.send_all_title": "Enviarlos todos a la vez",
 "mine.person_name_ph": "Nombre",
 "mine.step3_pick_person_aria": "Elige a una persona",
 "mine.step3_must_not_aria": "No debe regalarle a",
 "mine.countdown_label": "Cuenta regresiva para Navidad, viernes 25 de diciembre de 2026.",
 "mine.countdown_aria": "Cuenta regresiva para Navidad, viernes 25 de diciembre de 2026.",
 "mine.card_subtitle": "una tarjeta privada de tu asignación",
 "mine.card_you_got": "{name}, te tocó:",
 "mine.card_budget": "Presupuesto: {budget}",
 "mine.card_pick": "Idea de regalo: {name}",
 "mine.card_run": "Haz tu propio sorteo: pickmysecretsanta.com",
 "mine.ask_type_first": "Primero escribe algunas palabras.",
 "mine.ask_type_help": "Lo que hace, come, lee o juega es suficiente.",
 "mine.ask_heard": "Lo que entendí: {list}.",
 "mine.ask_picked_because": "Elegida porque dijiste: {list}.",
 "mine.ask_secret_title": "Las asignaciones se quedan en secreto.",
 "mine.ask_secret_1": "Tu pantalla muestra solo los nombres y los enlaces. Nunca muestra las asignaciones.",
 "mine.ask_secret_2": "Cada asignación se muestra solo por medio de su enlace privado.",
 "mine.ask_secret_3": "Tu dispositivo guarda todos los enlaces, así que lo que lo mantiene en secreto es que no mires: un enlace está oculto a simple vista, no bajo llave.",
 "mine.ask_secret_hint": "Abre tu propio enlace privado para ver solo tu asignación.",
 "mine.ask_org_screen": "La pantalla de tu organizador muestra solo los nombres y los enlaces. Nunca muestra las asignaciones.",
 "mine.recipient_ask_title_for": "¿Necesitas más ideas para {name}?",
 "mine.recipient_ask_label_for": "¿Qué le gusta a {name}?",
 "mine.recipient_secret_2": "Cada asignación queda detrás de su propio enlace privado, como una nota en un sobre, no una caja fuerte. Quien tenga un enlace puede abrirlo, así que guarda el tuyo en privado.",
 "mine.recipient_secret_hint": "Mejor pide ideas de regalo para {name}: cuenta arriba qué le gusta.",
 "mine.recipient_more_hint": "Más ideas para {name}: las ideas de tu enlace siguen arriba, al volver a subir.",
 "mine.add_three": "Agrega al menos tres nombres.",
 "mine.kid_suffix": " (niño)",
 "mine.done": "Listo",
 "mine.kids_off": "Desactivar niños y adultos separados",
 "mine.kids_on": "Mantener a niños y adultos separados",
 "mine.tag_kid_first": " Primero marca al menos a un niño.",
 "mine.chip_couple": "pareja",
 "mine.chip_lastyear": "año pasado",
 "mine.countdown_line": "Cuenta regresiva para Navidad, viernes 25 de diciembre de 2026.",
 "mine.sample_not_drawn": "Todavía no sorteado",
 "mine.sample_drawing": "Sorteando…",
 "mine.sample_mixing": "Mezclando los nombres…",
 "mine.sample_link_ready": "Enlace privado listo",
 "mine.manage_another_title": "¿También organizas otro grupo?",
 "mine.manage_another_line": "Empieza un sorteo nuevo con el presupuesto de este: grupo nuevo, nombres nuevos, completado en este dispositivo.",
 "mine.another_group_landing_line": "Tu presupuesto se trasladó de tu otro sorteo. Agrega el nombre de este grupo y los nombres: nadie verá quién le tocó a quién.",
 "mine.links_shared_of": "{sent} de {total} enlaces compartidos desde este dispositivo.",
 "mine.counts_taps": "Esto cuenta tus toques de Copiar y Compartir aquí.",
 "mine.copy_all_line": "Un toque copia cada nombre con su enlace privado, uno por línea.",
 "mine.copy_all_warn": "Quien reciba la lista completa puede abrir todas las asignaciones.",
 "mine.copy_all_btn": "Copiar todo: nombres + enlaces",
 "mine.copied_all": "Todo copiado",
 "mine.copy_all_head": "Tus enlaces privados de amigo secreto, toma solo tu línea:",
 "mine.copy_all_foot": "Cada enlace muestra solo la asignación de esa persona. No abras ni reenvíes el enlace de nadie más.",
 "mine.upgrade_line": "Este sorteo se guardó antes de que existieran los enlaces cortos, así que sus enlaces son los largos. Cambia y cada persona recibe un enlace corto, fácil de enviar, más una página del grupo donde ves quiénes ya abrieron el suyo. Tus enlaces largos siguen funcionando de cualquier forma.",
 "mine.upgrade_btn": "Cambiar a enlaces cortos",
 "mine.upgrade_working": "Cambiando…",
 "mine.upgrade_failed": "No se pudo cambiar en este momento: tus enlaces largos siguen funcionando. Revisa tu conexión e inténtalo de nuevo.",
 "mine.rules_msg_group": "El sorteo de amigo secreto de {group} ya está listo: presupuesto {budget}. Le enviaré a cada persona su enlace privado. Toca el tuyo para ver a quién te tocó: sin registro, y mi pantalla muestra solo los nombres y los enlaces, nunca las asignaciones. Guarda tu asignación en secreto y por favor respeta el presupuesto.",
 "mine.rules_msg_plain": "Nuestro sorteo de amigo secreto ya está listo: presupuesto {budget}. Le enviaré a cada persona su enlace privado. Toca el tuyo para ver a quién te tocó: sin registro, y mi pantalla muestra solo los nombres y los enlaces, nunca las asignaciones. Guarda tu asignación en secreto y por favor respeta el presupuesto."
};
window.SS_ES_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
window.SS_ES_DOM = [
 [
  "title",
  "title",
  "Generador de Amigo Secreto Gratis, Pick My Secret Santa: Sortea los Nombres en Secreto"
 ],
 [
  ".hero h1",
  "text",
  "Sortea los nombres del amigo secreto en secreto."
 ],
 [
  ".hero .sub",
  "text",
  "Gratis, sin registro. Agrega los nombres y un presupuesto. Toma unos 2 minutos."
 ],
 [
  "#cdx-more",
  "html",
  "¿Qué sigue? <span aria-hidden=\"true\">&#9662;</span>"
 ],
 [
  ".cdx-mile",
  "text",
  "Fecha para comprar: una semana antes del día del intercambio."
 ],
 [
  "#startBtn",
  "text",
  "Empezar el sorteo"
 ],
 [
  ".samplechip",
  "text",
  "Sorteo de muestra, no es uno real"
 ],
 [
  ".samplecard h2",
  "text",
  "Prueba un sorteo de muestra"
 ],
 [
  ".samplecard > p:first-of-type",
  "text",
  "Entran cuatro amigos. Salen cuatro enlaces privados."
 ],
 [
  ".samplenote",
  "text",
  "Cada asignación se muestra solo por medio de su propio enlace. Tu pantalla muestra los nombres y los enlaces, nunca quién le tocó a quién."
 ],
 [
  "#sampleRun",
  "text",
  "Hacerlo otra vez"
 ],
 [
  "#sampleProgress",
  "text",
  "4 de 4 enlaces listos"
 ],
 [
  "#sampleStart",
  "text",
  "Empezar con la muestra"
 ],
 [
  ".samplecard .hint:not(#sampleOpenHint)",
  "text",
  "Toca un nombre para hacerlo tuyo. No se sortea nada hasta que tú lo digas."
 ],
 [
  ".sstatus",
  "text",
  "Enlace privado listo"
 ],
 [
  "#sampleOpen",
  "text",
  "Abrir el enlace de muestra de Maya"
 ],
 [
  "#sampleOpenHint",
  "text",
  "Esto es una muestra. En un sorteo real, solo Maya puede abrir su enlace."
 ],
 [
  ".peeklab",
  "text",
  "Dentro del enlace de Maya, solo Maya ve esto"
 ],
 [
  "#samplePeek > p:nth-of-type(2)",
  "text",
  "Hola, Maya. Te tocó:"
 ],
 [
  "#samplePeek > p:nth-of-type(3)",
  "text",
  "Una de las seis ideas de regalo en su enlace:"
 ],
 [
  "section[aria-label=\"What we don't do\"] h2",
  "text",
  "Lo que no hacemos"
 ],
 [
  "section[aria-label=\"What we don't do\"] ul.checks li:nth-child(1)",
  "text",
  "El sorteo se hace en tu navegador. Nuestro servidor guarda los nombres y las asignaciones para los enlaces cortos, de una forma que podemos leer."
 ],
 [
  "section[aria-label=\"What we don't do\"] ul.checks li:nth-child(2)",
  "text",
  "Tú envías cada enlace privado. Cada enlace muestra una sola asignación."
 ],
 [
  "section[aria-label=\"What we don't do\"] ul.checks li:nth-child(3)",
  "text",
  "No vendemos regalos ni nos quedamos con ninguna comisión."
 ],
 [
  "#returnHook h2",
  "text",
  "Qué bueno verte de nuevo."
 ],
 [
  "#returnHook p",
  "text",
  "Haz un sorteo nuevo para un grupo nuevo.",
  0
 ],
 [
  "#returnHook a",
  "text",
  "Empezar un sorteo nuevo"
 ],
 [
  "#savedDraw h2",
  "text",
  "Tu sorteo guardado"
 ],
 [
  "#savedDraw > p:nth-of-type(1)",
  "text",
  "Tu último sorteo está guardado en este dispositivo."
 ],
 [
  "#savedDraw > p:nth-of-type(2)",
  "text",
  "Reenvía un enlace o comparte el comprobante."
 ],
 [
  "#runBackBtn",
  "text",
  "Repetirlo con el mismo grupo"
 ],
 [
  "#savedDraw p.hint",
  "text",
  "Guardado solo en este dispositivo. Nada se envió a un servidor.",
  0
 ],
 [
  "#savedDraw p.hint",
  "text",
  "Cualquiera que use este dispositivo puede abrir los enlaces. Borra el sorteo si es un dispositivo compartido.",
  1
 ],
 [
  "#clearDrawBtn",
  "text",
  "Borrar el sorteo guardado de este dispositivo"
 ],
 [
  "#clearDrawNote",
  "text",
  "Sorteo guardado borrado. Los enlaces que ya enviaste siguen funcionando."
 ],
 [
  "#linkMissingNote h2",
  "text",
  "A este enlace le falta su parte privada."
 ],
 [
  "#linkMissingNote > p",
  "text",
  "Parece que tocaste un enlace de amigo secreto, pero la mitad secreta del enlace no llegó, algunas aplicaciones la cortan. Tu asignación no se perdió: pídele a tu organizador que te vuelva a enviar tu enlace completo y toca el nuevo. En esta página no se muestra nada de tu asignación.",
  0
 ],
 [
  "label[for=pasteLinkBox]",
  "text",
  "¿Tienes el enlace completo en un mensaje? Pégalo aquí."
 ],
 [
  "#pasteLinkBox",
  "ph",
  "Pega tu enlace completo"
 ],
 [
  "#pasteLinkBtn",
  "text",
  "Abrir mi enlace"
 ],
 [
  "#pasteLinkErr",
  "text",
  "Ese enlace no funciona: revisa que lo hayas copiado completo."
 ],
 [
  "label[for=revealPasteBox]",
  "text",
  "¿Tienes el enlace completo en un mensaje? Pégalo aquí."
 ],
 [
  "#revealPasteBox",
  "ph",
  "Pega tu enlace completo"
 ],
 [
  "#revealPasteBtn",
  "text",
  "Abrir mi enlace"
 ],
 [
  "#revealPasteErr",
  "text",
  "Ese enlace no funciona: revisa que lo hayas copiado completo."
 ],
 [
  "#linkMissingNote p.hint",
  "text",
  "¿Eres el organizador? Tu enlace de administración está en el sorteo guardado en este dispositivo.",
  1
 ],
 [
  "#step1 .progress",
  "text",
  "Paso 1 de 3"
 ],
 [
  "#warmTitle",
  "text",
  "Haz tu propio sorteo"
 ],
 [
  "#warmHead p",
  "text",
  "Nombre y presupuesto vienen del sorteo en el que estabas. Cambia lo que quieras. Nadie verá quién le tocó a quién, igual que en el tuyo."
 ],
 [
  "#step1Title",
  "text",
  "Tu grupo"
 ],
 [
  "label[for=groupName]",
  "text",
  "Nombre del grupo (opcional)"
 ],
 [
  "#groupName",
  "ph",
  "ej. El grupo de la oficina"
 ],
 [
  "label[for=organizerName]",
  "text",
  "Tu primer nombre (opcional)"
 ],
 [
  "#organizerName",
  "ph",
  "ej. María"
 ],
 [
  "#step1 p.hint",
  "text",
  "Agrégalo y la portada del enlace de cada persona (la primera página que ven al abrir su enlace) dirá quién organizó el sorteo. Déjalo en blanco y las portadas quedan como están.",
  0
 ],
 [
  "#step1 label.lab:not([for])",
  "text",
  "Presupuesto del regalo"
 ],
 [
  "#budgetChips",
  "aria",
  "Presupuesto del regalo"
 ],
 [
  "#toStep2",
  "text",
  "Siguiente: agregar los nombres"
 ],
 [
  "#step1 p.hint",
  "html",
  "¿Primera vez? <a href=\"/how-to-run-a-secret-santa\">Mira cómo funciona.</a>",
  1
 ],
 [
  "#step2 .progress",
  "text",
  "Paso 2 de 3"
 ],
 [
  "#step2 h2",
  "text",
  "¿Quiénes participan?"
 ],
 [
  "#sampleDraftNote p",
  "html",
  "<strong>A partir de la muestra.</strong> Estos cuatro nombres son un borrador: toca cualquier nombre y escribe encima, toca × para quitar uno, o agrega los tuyos abajo. No se sortea nada hasta que toques Sortear."
 ],
 [
  "#bulkToggle",
  "text",
  "Pegar una lista en su lugar"
 ],
 [
  "label[for=bulkText]",
  "text",
  "Pega los nombres, uno por línea"
 ],
 [
  "#bulkPanel p.hint",
  "text",
  "Solo los nombres está bien: uno por línea, o en una sola línea separados por comas. Para agregar un gusto, ponlo solo después del primer nombre: María, cocina. Después puede ir una nota de deseos.",
  0
 ],
 [
  "#bulkText",
  "ph",
  "María, cocina\nSam\nJo, sorpréndeme"
 ],
 [
  "#bulkAdd",
  "text",
  "Agregar a estas personas"
 ],
 [
  "#bulkClose",
  "text",
  "o escríbelos uno por uno"
 ],
 [
  "label[for=bulkFile]",
  "text",
  "O elige un archivo de lista (.csv o .txt)"
 ],
 [
  "#addPerson",
  "text",
  "+ Agregar a una persona"
 ],
 [
  "#askBox .summaryline",
  "text",
  "Cuenta qué le gusta, con tus palabras"
 ],
 [
  "#askBox > p:nth-of-type(2)",
  "text",
  "Una persona a la vez, en palabras simples."
 ],
 [
  ".askchip",
  "text",
  "Le encanta la parrilla y la comida picante",
  0
 ],
 [
  ".askchip",
  "text",
  "Corre por senderos y acampa al aire libre",
  1
 ],
 [
  ".askchip",
  "text",
  "Lee novelas en un sillón grande y cómodo",
  2
 ],
 [
  "label[for=askWords]",
  "text",
  "¿Qué le gusta?"
 ],
 [
  "#askWords",
  "ph",
  "ej. siempre está en el sendero con su perro"
 ],
 [
  "label[for=askBand]",
  "text",
  "Presupuesto para estas ideas"
 ],
 [
  "#askBand option[value=u25]",
  "text",
  "Menos de $25"
 ],
 [
  "#askBand option[value=m2550]",
  "text",
  "$25-$50"
 ],
 [
  "#askBand option[value=m50100]",
  "text",
  "$50-$100"
 ],
 [
  "#askBand option[value=m100]",
  "text",
  "$100+"
 ],
 [
  "#askGo",
  "text",
  "Buscar seis ideas de regalo"
 ],
 [
  "#askBox p.hint",
  "text",
  "No necesitas ningún nombre. Se busca en este dispositivo: no se envía ni se guarda nada.",
  0
 ],
 [
  "#step2 > p.hint",
  "text",
  "Agrega al menos tres nombres. ¿Dos personas se llaman igual? Agrega la inicial del apellido.",
  0
 ],
 [
  "#step2 > p.hint",
  "text",
  "Las notas de deseos se quedan en este dispositivo y nunca van en los enlaces. Una nota solo aparece cuando el amigo secreto abre su enlace en este dispositivo.",
  1
 ],
 [
  "#back1",
  "text",
  "Atrás"
 ],
 [
  "#toStep3",
  "text",
  "Siguiente: quiénes no deben salir sorteados entre sí"
 ],
 [
  "#drawNowBtn",
  "text",
  "Sortear los nombres ahora"
 ],
 [
  "#step3 .progress",
  "text",
  "Paso 3 de 3"
 ],
 [
  "#step3 h2",
  "text",
  "Quiénes no deben salir sorteados entre sí (opcional)"
 ],
 [
  "#step3 > p",
  "text",
  "Toca un nombre. Luego toca a todas las personas que no deben regalarle. Funciona en ambos sentidos.",
  1
 ],
 [
  "#restrictPeople",
  "aria",
  "Elige a una persona"
 ],
 [
  "#restrictList",
  "aria",
  "No debe regalarle a"
 ],
 [
  "#step3 > label.lab",
  "text",
  "Formas rápidas de agregar reglas"
 ],
 [
  "#presetCouples",
  "text",
  "Parejas separadas"
 ],
 [
  "#presetLastYear",
  "text",
  "Las parejas del año pasado"
 ],
 [
  "#presetKids",
  "text",
  "Niños y adultos separados"
 ],
 [
  "#clearRestrict",
  "text",
  "Borrar todas las reglas"
 ],
 [
  "#fourPairNote",
  "text",
  "Con cuatro personas y parejas separadas, una asignación puede revelar otra."
 ],
 [
  "#smallDrawNote",
  "text",
  "Ojo: con solo 3 personas, una pareja separada deja el sorteo sin ninguna opción justa. Dos personas terminan pudiendo elegir solo el mismo único nombre. Quita la pareja, o agrega una cuarta persona, antes de sortear."
 ],
 [
  "#step3 > p.hint",
  "html",
  "¿Preguntas? <a href=\"#faq\">Mira las preguntas de abajo.</a>",
  2
 ],
 [
  "#fairnessLine",
  "text",
  "El sorteo es aleatorio. Nadie se saca a sí mismo, y las parejas que separas nunca se regalan entre sí. Tu pantalla mostrará solo nombres y enlaces, nunca las asignaciones. Cada asignación queda detrás de su propio enlace privado."
 ],
 [
  "#back2",
  "text",
  "Atrás"
 ],
 [
  "#drawBtn",
  "text",
  "Sortear los nombres"
 ],
 [
  "#step4 h2",
  "text",
  "Tu sorteo está listo. Envía a cada persona su enlace privado de asignación."
 ],
 [
  "#kitExplainer",
  "text",
  "Un enlace para una persona. Quien lo abra ve su asignación. Envíalo solo a esa persona."
 ],
 [
  "#step4 > p",
  "text",
  "Tú ves los nombres y los enlaces. Nunca las asignaciones.",
  2
 ],
 [
  "#threePersonNote",
  "text",
  "Con tres personas, una asignación revela las demás."
 ],
 [
  "#fourPersonNote",
  "text",
  "Con cuatro personas y parejas separadas, una asignación puede revelar otra."
 ],
 [
  "#redrawWarn",
  "text",
  "Los enlaces nuevos reemplazarán a estos. Los enlaces que ya enviaste siguen funcionando y muestran el sorteo anterior. Envía solo el juego nuevo."
 ],
 [
  "#step4 > p.hint",
  "html",
  "¿Alguien se suma tarde? <a href=\"/can-you-add-someone-to-secret-santa-after-the-draw\">Mira las dos formas de agregarlo.</a>",
  2
 ],
 [
  "#groupMsgBtn",
  "text",
  "Copiar un mensaje para todo el grupo"
 ],
 [
  "#step4 > p.hint",
  "text",
  "Envía primero ese mensaje al chat del grupo. Avisa el presupuesto y las reglas.",
  3
 ],
 [
  "#step4 > p.hint",
  "html",
  "¿Olvidaste un paso? <a href=\"/how-to-run-a-secret-santa\">Revisa cómo funciona.</a>",
  4
 ],
 [
  "#redraw",
  "text",
  "Sortear de nuevo"
 ],
 [
  "#startOver",
  "text",
  "Empezar de cero"
 ],
 [
  "#guide h2",
  "text",
  "Cómo funciona"
 ],
 [
  "#guide p",
  "text",
  "Agrega los nombres y un presupuesto. Toca Sortear. Envía a cada persona su enlace privado.",
  0
 ],
 [
  "#guide a",
  "text",
  "Hazlo paso a paso"
 ],
 [
  "section[aria-label=\"Gift picks\"] h2",
  "text",
  "Seis ideas de regalo para cada persona"
 ],
 [
  "section[aria-label=\"Gift picks\"] p",
  "text",
  "De 212 opciones reales revisadas. Todas se ajustan a tu presupuesto.",
  0
 ],
 [
  "section[aria-label=\"Gift picks\"] a",
  "text",
  "Ideas de regalo para adolescentes",
  0
 ],
 [
  "section[aria-label=\"Gift picks\"] a",
  "text",
  "Ideas de regalo divertidas",
  1
 ],
 [
  "#faq h2",
  "text",
  "Preguntas frecuentes"
 ],
 [
  "#faq > p",
  "text",
  "Tu pantalla muestra solo los nombres y los enlaces. Nunca muestra quién le tocó a quién. Un enlace está oculto a simple vista, no bajo llave.",
  0
 ],
 [
  "#faq a",
  "text",
  "¿El organizador puede ver quién le tocó a quién?",
  0
 ],
 [
  "#faq a",
  "text",
  "¿Cuántas personas se necesitan?",
  1
 ],
 [
  "#faq a",
  "text",
  "Agregar a alguien después del sorteo",
  2
 ],
 [
  "#faq a",
  "text",
  "Enlace perdido o reenviar un enlace",
  3
 ],
 [
  "#faq a",
  "text",
  "Mantener separadas a ciertas parejas",
  4
 ],
 [
  "#faq a",
  "text",
  "¿Cómo funciona el amigo secreto?",
  5
 ],
 [
  "#faq a",
  "text",
  "Sortear nombres en línea",
  6
 ],
 [
  "#reveal-games h2",
  "text",
  "El día del intercambio"
 ],
 [
  "#reveal-games p",
  "text",
  "Elige un juego para revelar: Adivina primero, Tres pistas, Revienta el globo. Tu enlace muestra cinco juegos más el día del intercambio.",
  0
 ],
 [
  "section[aria-label=\"Who made this\"] h2",
  "text",
  "Hecho por un papá, en su tiempo libre"
 ],
 [
  "section[aria-label=\"Who made this\"] p",
  "text",
  "Soy Billy, un papá en Redmond. Creo estas herramientas en mi tiempo libre, con IA.",
  0
 ],
 [
  "#revealCover h2",
  "text",
  "Tu asignación secreta está lista."
 ],
 [
  "#coverLine",
  "text",
  "Este es para ti."
 ],
 [
  "#peekBtn",
  "text",
  "Toca para abrir tu regalo"
 ],
 [
  "#ownDrawCover",
  "text",
  "Haz tu propio sorteo"
 ],
 [
  "#ownDrawCard",
  "text",
  "Haz tu propio sorteo gratis"
 ],
 [
  "#wishBlock h2",
  "text",
  "Su lista de deseos"
 ],
 [
  "#wishBlock .hint",
  "text",
  "Tu organizador guardó esta nota en este dispositivo. Nunca se envió a ningún lado y no está en tu enlace."
 ],
 [
  "section[aria-label=\"All your gift ideas\"] h2",
  "text",
  "Todas tus ideas de regalo"
 ],
 [
  "section[aria-label=\"All your gift ideas\"] .hint",
  "text",
  "Toca «Siguiente idea de regalo» en la tarjeta de arriba para ver todos los detalles."
 ],
 [
  "#giftSpecSummary",
  "text",
  "Qué buscar"
 ],
 [
  "#recipientAskTitle",
  "text",
  "¿Necesitas más ideas?"
 ],
 [
  "#recipientAskLabel",
  "text",
  "¿Qué le gusta?"
 ],
 [
  "#recipientAskWords",
  "ph",
  "ej. siempre está en el sendero con su perro"
 ],
 [
  "#recipientAskGo",
  "text",
  "Buscar seis ideas de regalo"
 ],
 [
  "#anotherPick",
  "text",
  "Siguiente idea de regalo"
 ],
 [
  "#saveCard",
  "text",
  "Guardar mi tarjeta"
 ],
 [
  "#revealCard > p.hint",
  "text",
  "Guárdalo en secreto.",
  0
 ],
 [
  "#ownDrawTitle",
  "text",
  "¿Quieres organizar tu propio amigo secreto?"
 ],
 [
  "#ownDrawHint",
  "text",
  "Sin registro. Toma unos 2 minutos."
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] h2",
  "text",
  "Entrégalo sin revelar quién eres",
  0
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] h2",
  "text",
  "El día del intercambio",
  1
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "text",
  "Elige la forma que mejor va con tu lugar.",
  0
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Déjalo en su escritorio.</strong> Déjalo en su escritorio antes de que empiece el trabajo. Aléjate antes de que se siente. Funciona mejor si sabes a qué hora llega.",
  1
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Déjalo en su puerta.</strong> Deja el regalo en la puerta de su casa. Toca una vez y aléjate rápido. ¿Va a llover? Déjalo primero bajo techo.",
  2
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Déjalo en recepción.</strong> Déjalo en recepción o en la sala de correo. Pide al personal que se lo entregue más tarde. Pon solo su nombre en la etiqueta.",
  3
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Entrega con ayuda.</strong> Pídele a un amigo que no participa en el juego que lo entregue. Solo dirá una frase: esto es para ti. Elige a alguien que no revele tu nombre.",
  4
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Escóndelo en su casillero.</strong> Déjalo en su casillero, su cubículo o su cajón. Usa un lugar que abra todos los días. Asegúrate de que nadie más pueda alcanzarlo.",
  5
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Sorpresa en el buzón.</strong> Déjalo en su casillero de correo del trabajo. Agrega una etiqueta que diga: ábrelo después, a solas. Los regalos pequeños y blandos entran mejor así.",
  6
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Caja sencilla por correo.</strong> Envíalo en una caja sencilla y resistente. No escribas nombre ni dirección del remitente. Envíalo temprano: el correo se retrasa en temporada de fiestas.",
  7
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Pistas escondidas.</strong> Esconde el regalo en un lugar seguro y cercano. Deja una primera pista donde seguro la verá. Cada pista lleva a la siguiente. La última pista lleva al regalo.",
  8
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Caja señuelo.</strong> Pon el regalo dentro de una caja más grande y graciosa. Envuelve esa caja en papel sencillo. La forma rara esconde lo que hay dentro. Agrega relleno suave para que nada suene.",
  9
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Déjalo en la mesa de regalos.</strong> Ponlo temprano en la mesa de regalos compartida. Llega antes que tu persona. Luego únete al grupo como todos los demás.",
  10
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "text",
  "Para todas las formas: usa papel de envolver sencillo. Imprime la etiqueta. Tu letra te delata.",
  11
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "text",
  "Elige un juego para todo el grupo.",
  12
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Adivina primero.</strong> Abran un regalo a la vez, por turnos. Cada persona primero adivina quién es su amigo secreto. Solo entonces el amigo secreto se revela.",
  13
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Pista en la etiqueta.</strong> Escribe una pista en la etiqueta del regalo. Lee la etiqueta en voz alta antes de abrir. El grupo adivina solo con la pista.",
  14
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Juego de las tres pistas.</strong> Cada amigo secreto da tres pistas, una por una. Las pistas empiezan difíciles y se vuelven más fáciles. La persona adivina después de cada pista.",
  15
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Nota dentro del papel.</strong> Esconde una nota firmada dentro del papel de envolver. Tu persona la encuentra mientras abre el regalo. Deja el exterior del regalo en blanco.",
  16
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Ponte de pie y señala.</strong> Después del último regalo, todos los amigos secretos se ponen de pie. Cada persona señala su mejor suposición. Los amigos secretos se sientan cuando alguien acierta.",
  17
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Revienta el globo.</strong> Pon el nombre de cada amigo secreto dentro de un globo. Cada persona revienta uno después de abrir su regalo. El nombre de adentro revela a su amigo secreto.",
  18
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Revelación en video.</strong> Graba un clip corto antes de la fiesta. Empieza con un sombrero o una máscara. Quítatelo y di tu nombre. Reproduzcan los clips después del último regalo.",
  19
 ],
 [
  "section[aria-label=\"Give it and reveal it\"] > p",
  "html",
  "<strong>Todos a la vez.</strong> Díganlo todos a la vez después del último regalo. Sin adivinanzas, sin juegos, todos los nombres juntos. Un amigo secreto puede quedarse en secreto si quiere.",
  20
 ],
 [
  "#revealError h2",
  "text",
  "Este enlace no funciona."
 ],
 [
  "#revealError .sub",
  "text",
  "Pídele a tu organizador uno nuevo."
 ],
 [
  "#reveal > p.hint",
  "text",
  "Confía solo en un enlace que te haya enviado tu organizador."
 ],
 [
  ".works-with-ai h2",
  "text",
  "Funciona con tu IA"
 ],
 [
  ".works-with-ai > p",
  "text",
  "Tu IA puede elegir entre las 212 ideas de regalo revisadas a mano de este sitio, según tu persona y tu presupuesto. El sorteo secreto en sí se queda aquí, en el sitio.",
  0
 ],
 [
  ".works-with-ai > p",
  "text",
  "Conecta este sitio a Claude, Cursor o cualquier otro cliente MCP. Es gratis y toma alrededor de un minuto.",
  1
 ],
 [
  ".works-with-ai > p",
  "html",
  "<strong>1. Copia la dirección del servidor</strong>",
  2
 ],
 [
  ".wai-copy",
  "text",
  "Copiar"
 ],
 [
  ".works-with-ai > p",
  "html",
  "<strong>2. Agrégala a tu IA</strong>",
  3
 ],
 [
  ".works-with-ai summary",
  "text",
  "Claude Code, un solo comando",
  0
 ],
 [
  ".works-with-ai summary",
  "text",
  "Claude Desktop o Cursor, pégala en los ajustes de MCP",
  1
 ],
 [
  ".works-with-ai > p",
  "html",
  "<strong>3. Pregúntale a tu IA:</strong> «Necesito un regalo de amigo secreto para un compañero de trabajo al que le encanta el café, por menos de $25.»",
  4
 ],
 [
  "#countdown",
  "text",
  "Cuenta regresiva para Navidad, viernes 25 de diciembre de 2026."
 ],
 [
  "#cdx-main",
  "aria",
  "Cuenta regresiva para Navidad, viernes 25 de diciembre de 2026."
 ],
 [
  "#cdx-dl",
  "text",
  "días"
 ],
 [
  ".cdx-digits .cdx-cell:nth-child(2) i",
  "text",
  "h"
 ],
 [
  ".cdx-digits .cdx-cell:nth-child(3) i",
  "text",
  "min"
 ],
 [
  ".cdx-digits .cdx-cell:nth-child(4) i",
  "text",
  "s"
 ],
 [
  "footer",
  "html",
  "Built with Muse.<br>\n    Preguntas: hello@pickmysecretsanta.com<br>\n    <a href=\"https://thepresentpicker.com\">The Present Picker</a> &middot; <a href=\"/privacy\">Privacidad</a> &middot; <a href=\"/terms\">Términos</a>"
 ]
];
