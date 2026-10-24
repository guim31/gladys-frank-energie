# Frank Energie

Les prix dynamiques de l'électricité et du gaz de [Frank Energie](https://www.frankenergie.nl),
le fournisseur néerlandais, dans Gladys : le prix de l'heure en cours, les heures les
moins chères du jour, une courbe des prix du jour et du lendemain, et des
déclencheurs de scène pour lancer vos appareils quand l'électricité est la moins
chère.

Cette intégration n'a aucun lien avec Frank Energie. Elle lit les prix publics de
Frank Energie, testée sur l'API réelle, mais a été développée sans contrat Frank
Energie : vos retours sont les bienvenus.

## Présentation

Frank Energie publie, sans compte ni clé :

- les **prix horaires de l'électricité** du marché day-ahead néerlandais (EPEX, zone
  NL), en prix du marché ou en prix tout compris payé par un client Frank Energie
  par kWh (prix du marché, frais d'achat et taxe sur l'énergie), avec ou sans TVA ;
- le **prix du gaz** de la journée gazière, valable de 6 h à 6 h, de la même façon.

Les prix du lendemain sont publiés entre 13 h et 15 h. Le prix tout compris est le
prix à l'unité : les frais fixes mensuels et la réduction annuelle de taxe de votre
contrat n'y sont pas.

Votre **compte Frank Energie** (prix personnalisés, consommation, coûts, recharge
intelligente) n'est pas utilisé : cette version ne lit que les prix publics.

Toutes les heures sont données à l'heure d'Amsterdam, et une journée va de minuit à
minuit à Amsterdam, quel que soit le fuseau de votre Gladys.

## Prérequis

- Gladys Assistant 5.1.0 ou plus récent.
- Un accès internet depuis Gladys vers `graphql.frankenergie.nl`.
- Rien d'autre : ni compte, ni clé d'API, ni matériel.

## Installation

1. Dans Gladys, ouvrez **Intégrations → Installer depuis GitHub** et saisissez
   `https://github.com/guim31/gladys-frank-energie`.
2. Ouvrez l'intégration, vérifiez la configuration, enregistrez.
3. Ouvrez l'onglet **Découverte** et ajoutez l'appareil **Frank Energie**.
4. Sur un tableau de bord, ajoutez le widget **Prix de l'électricité**.

## Configuration

| Champ                              | Défaut       | Rôle                                                                                   |
| ---------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| Prix de l'électricité              | Tout compris | Prix tout compris à l'unité, ou prix du marché EPEX day-ahead seul                     |
| Inclure la TVA                     | Oui          | Prix avec la TVA néerlandaise (21 %)                                                   |
| Prix du gaz                        | Oui          | Afficher aussi le prix du gaz du jour ; le changer ajoute ou retire une fonctionnalité |
| Langue des noms de fonctionnalités | Français     | Utilisée à l'ajout de l'appareil : les noms ne changent plus ensuite                   |

Le bouton **Relever les prix maintenant** interroge Frank Energie tout de suite et
affiche ce qu'il publie pour aujourd'hui et demain : pratique pour vérifier la
connexion.

## L'appareil Frank Energie

Un seul appareil, en lecture seule, rafraîchi par l'intégration elle-même chaque
minute (les prix sont relevés chez Frank Energie une fois par heure).

| Fonctionnalité                    | Type     | Valeur                                                                                 |
| --------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Prix actuel (€/kWh)               | Prix     | Prix de l'heure en cours                                                               |
| Prix heure suivante (€/kWh)       | Prix     | Prix de l'heure suivante (après 23 h, une fois demain connu)                           |
| Prix moyen du jour (€/kWh)        | Prix     | Moyenne des heures du jour                                                             |
| Prix min du jour (€/kWh)          | Prix     | Heure la moins chère du jour                                                           |
| Prix max du jour (€/kWh)          | Prix     | Heure la plus chère du jour                                                            |
| Heure la moins chère du jour      | Texte    | Début de l'heure la moins chère, `HH:MM`                                               |
| Heure la plus chère du jour       | Texte    | Début de l'heure la plus chère, `HH:MM`                                                |
| Rang de l'heure (1 = moins chère) | Compteur | Rang de l'heure en cours dans la journée, de 1 à 24 (23 ou 25 aux changements d'heure) |
| Prix du gaz du jour (€/m³)        | Prix     | Prix du gaz de la journée gazière (6 h à 6 h), s'il est activé                         |

Gladys n'a pas d'unité €/kWh : les prix s'affichent en euros, le nom dit par quoi.
Quand une fonctionnalité est la seule de son type sur l'appareil, le tableau de bord
affiche le libellé générique du type (« Compteur entier ») à la place de son nom.

## Widget du tableau de bord

**Prix de l'électricité** affiche le type de prix, trois tuiles (maintenant, heure
suivante, moyenne du jour), la courbe du jour et du lendemain avec l'heure la moins
chère et la plus chère de chaque jour marquées et un trait à l'heure actuelle, puis
l'heure la moins chère d'aujourd'hui et de demain, la moyenne de demain et le prix
du gaz. Tant que les prix de demain ne sont pas publiés, il
l'indique.

## Déclencheurs de scène

Deux déclencheurs, dans l'éditeur de scènes sous **Frank Energie**. Tous deux portent
sur l'électricité et sur les heures de la journée en cours (de minuit à minuit).

### Les heures les moins chères du jour commencent

Se déclenche une fois par jour, au début de la plage d'heures consécutives la moins
chère du jour. Choisissez la durée de la plage : de 1 à 6 ou 8 heures (1 heure,
c'est l'heure la moins chère du jour). Variables : prix moyen de la plage, heures de
début et de fin.

### Une des heures les moins chères commence

Se déclenche au début de chacune des N heures les moins chères du jour, consécutives
ou non. Choisissez N : de 1 à 6, 8, 10 ou 12. Variables : prix de l'heure, son rang,
heures de début et de fin.

Les déclencheurs partent quand l'heure commence, avec au plus 10 minutes de retard
(redémarrage de Gladys ou de l'intégration) : une heure commencée depuis plus
longtemps ne déclenche rien. « Le prix passe sous X » n'est pas un déclencheur :
utilisez la fonctionnalité **Prix actuel** avec la condition de seuil de l'éditeur de
scènes.

## Exemples de scènes

- **Lave-vaisselle sur les 3 heures les moins chères** : déclencheur _Les heures les
  moins chères du jour commencent_, 3 heures → allumer la prise du lave-vaisselle.
- **Ballon d'eau chaude sur les 4 heures les moins chères** : déclencheur _Une des
  heures les moins chères commence_, 4 → allumer le ballon ; une seconde scène sur
  _Rang de l'heure_ supérieur à 4 → l'éteindre.
- **Prix négatif** : quand _Prix actuel_ (prix du marché) passe sous 0 → allumer le
  ballon et envoyer le message « L'électricité est gratuite en ce moment ».

## Rafraîchissement et usage de l'API

Frank Energie ne publie pas de quota pour cette API publique. L'intégration en use
peu :

- deux requêtes par heure, une pour aujourd'hui et une pour demain, chacune
  répondant avec les prix de l'électricité et du gaz de la journée ;
- à partir de 13 h, les deux de nouveau toutes les 15 minutes tant que les prix du
  lendemain ne sont pas publiés, puis de nouveau une fois par heure ;
- après un échec, nouvel essai après 5, 10, 20, 40 puis 60 minutes ; les derniers
  prix connus restent utilisés en attendant (les prix sont connus un jour à l'avance).

Les états ne sont publiés que lorsqu'ils changent, avec un rappel toutes les 6 heures.

## Dépannage

- **« Frank Energie est injoignable »** dans l'écran de configuration : Gladys n'a pas
  accès à internet, ou Frank Energie est en panne. Les derniers prix connus restent
  utilisés ; appuyez sur **Relever les prix maintenant** pour réessayer.
- **« ne publie aucun prix d'électricité pour aujourd'hui »** : Frank Energie a
  répondu sans prix pour la journée, ce qui arrive lors d'un incident de
  publication. L'intégration réessaie toutes les 15 minutes.
- **Aucune valeur sur l'appareil** : ajoutez d'abord l'appareil depuis l'onglet
  Découverte ; ses valeurs arrivent aussitôt.
- **La fonctionnalité gaz manque ou reste affichée** : après avoir changé le réglage
  du gaz, ouvrez l'onglet Découverte et appuyez sur **Mettre à jour** sur l'appareil.
- **Logs détaillés** : définissez `LOG_LEVEL=debug` sur le conteneur pour voir chaque
  relève.

## Limites

- Prix horaires. Le marché day-ahead néerlandais se négocie au quart d'heure depuis
  octobre 2025, et Frank Energie sait les publier : cette version affiche les prix
  horaires (la moyenne des quatre quarts d'heure).
- Les prix publics seulement : pas de connexion au compte, donc ni prix
  personnalisés, ni consommation, ni coûts, ni recharge intelligente.
- Le prix tout compris hors TVA est calculé à partir des composantes que publie
  Frank Energie, avec la TVA néerlandaise de 21 %.
- Les déclencheurs ne regardent que la journée en cours : une plage la moins chère ne
  passe jamais minuit.
- Lecture seule : l'intégration ne pilote rien elle-même.
- Les noms des fonctionnalités sont fixés à l'ajout de l'appareil ; changer la langue
  ensuite ne les renomme pas.

## Comparaison avec EnergyZero

Cette intégration suit l'[intégration EnergyZero](https://github.com/guim31/gladys-energyzero)
du même auteur : même appareil, même widget, mêmes déclencheurs, si bien qu'une scène
passe de l'une à l'autre. Les deux lisent le même marché day-ahead néerlandais ; les
prix tout compris diffèrent par la marge de chaque fournisseur. Prenez celle de votre
fournisseur.
