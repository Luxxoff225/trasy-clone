-- Templates WhatsApp
insert into message_templates (key, channel, language, body) values
('package_received', 'whatsapp', 'fr', 'Bonjour {nom} 👋, nous avons bien reçu votre colis *{nature_colis}* ({poids} kg) en Chine. Numéro de suivi : *{tracking}*. Délai estimé : 5-7 jours. Nous vous notifierons à chaque étape. Merci de votre confiance ! 🚀'),
('package_in_transit', 'whatsapp', 'fr', 'Bonne nouvelle {nom} ! 🚢 Votre colis *{tracking}* ({nature_colis}, {poids} kg) a quitté la Chine et est en route vers Abidjan. Livraison prévue dans 5-7 jours.'),
('package_available', 'whatsapp', 'fr', 'Votre colis est arrivé ! 🎉 {nom}, votre colis *{tracking}* ({nature_colis}) est disponible et prêt à être retiré. Montant à régler : *{montant_a_payer}*. Contactez-nous pour convenir du retrait.'),
('package_delivered', 'whatsapp', 'fr', 'Merci {nom} ! ✅ Votre colis *{tracking}* a bien été remis. Merci de votre confiance. À bientôt pour votre prochain envoi ! 🙏'),
('package_dispute', 'whatsapp', 'fr', 'Bonjour {nom}, votre colis *{tracking}* nécessite votre attention. Veuillez nous contacter rapidement pour résoudre la situation. Merci.');

-- Templates SMS (version courte)
insert into message_templates (key, channel, language, body) values
('package_received', 'sms', 'fr', 'Bonjour {nom}, colis {tracking} ({poids}kg) reçu en Chine. Délai 5-7j. On vous tient informé.'),
('package_in_transit', 'sms', 'fr', 'Bonjour {nom}, votre colis {tracking} a quitté la Chine. Livraison dans 5-7 jours.'),
('package_available', 'sms', 'fr', 'Bonjour {nom}, colis {tracking} disponible à Abidjan. Montant: {montant_a_payer}. Contactez-nous.'),
('package_delivered', 'sms', 'fr', 'Bonjour {nom}, colis {tracking} remis. Merci de votre confiance !'),
('package_dispute', 'sms', 'fr', 'Bonjour {nom}, problème avec colis {tracking}. Contactez-nous urgent.');
