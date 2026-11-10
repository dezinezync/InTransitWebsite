---
layout: post
title: The Nucleon Update ‒ v2026.11
date: 2026-11-10T09:30:00+05:30
categories: iOS,release,notes
bannerImageWebP: /assets/images/posts/20261110/banner
---

In March when I first released InTransit to the public, people were thrilled to see a modern metro transit app made specifically for India. Nobody had ever attempted this before, and of course I was foolish as ever to think I can do this. Well, I did, and it worked, and as a proof-of-concept that this is something people would use, it made sense to invest some more time in the app and improve how it works. 

So once I had completed all my iOS 27 and iPhone Duo updates for [Elytra](https://elytra.app) and [Pockity](https://pockity.app), I spent three works re-designing every single screen in InTransit, removing a lot of cruft from the app and polish up all the rough edges (there were so many!)

For this redesign, I decided to try the [Atomic Design](https://atomicdesign.bradfrost.com/chapter-2/) method popularized by Brad Frost. I built several small components (atoms), gradually composing them into larger components (molecules). I then skipped the "organisms" step, directly jumping to templates and pages as Brad describes in his document. 

<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)"
    srcset="/assets/images/posts/20261110/atoms-dark-400w.webp 1x, /assets/images/posts/20261110/atoms-dark-800w.webp 2x, /assets/images/posts/20261110/atoms-dark-1200w.webp 3x"
    width="402" height="1938"
    type="image/webp"/>
  <source media="(min-width: 601px) and (max-width: 800px) and (prefers-color-scheme: dark)"
    srcset="/assets/images/posts/20261110/atoms-dark-800w.webp 1x, /assets/images/posts/20261110/atoms-dark-1600w.webp 2x, /assets/images/posts/20261110/atoms-dark@3x.webp 3x"
    width="402" height="1938"
    type="image/webp"/>
  <source media="(prefers-color-scheme: dark)" type="image/webp"
    srcset="/assets/images/posts/20261110/atoms-dark.webp 1x, /assets/images/posts/20261110/atoms-dark@2x.webp 2x, /assets/images/posts/20261110/atoms-dark@3x.webp 3x"
    width="402" height="1938"/>
  <source media="(max-width: 600px)"
    srcset="/assets/images/posts/20261110/atoms-400w.webp 1x, /assets/images/posts/20261110/atoms-800w.webp 2x, /assets/images/posts/20261110/atoms-1200w.webp 3x"
    type="image/webp"/>
  <source media="(min-width: 601px) and (max-width: 800px)"
    srcset="/assets/images/posts/20261110/atoms-800w.webp 1x, /assets/images/posts/20261110/atoms-1600w.webp 2x, /assets/images/posts/20261110/atoms@3x.webp 3x"
    type="image/webp"/>
  <source type="image/webp"
    srcset="/assets/images/posts/20261110/atoms.webp 1x, /assets/images/posts/20261110/atoms@2x.webp 2x, /assets/images/posts/20261110/atoms@3x.webp 3x"/>
  <img src="/assets/images/posts/20261110/atoms.webp"
    srcset="/assets/images/posts/20261110/atoms@2x.webp 2x, /assets/images/posts/20261110/atoms@3x.webp 3x"
    alt="The atoms of the InTransit redesign: the small components that the larger components are built from"
    loading="lazy"
    width="402"
    height="1918"
    style="border-radius: 8px; max-width: 100%; height: auto;">
</picture>

Something else I focused early on were the micro and macro interactions for these molecules. However, unnecessary motion sometimes introduces additional cognitive load for some people. While most people who go through this have "Reduced Motion" enabled on their iPhones, some don't. So to be careful as to not overdo any of the interaction animations, I kept them intentionally subtle. 

> You'll miss it if you blink… and that's okay 

None of these interaction animations convey state, they only animate a molecule from one state to another. 

<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)"
    srcset="/assets/images/posts/20261110/molecules-dark-400w.webp 1x, /assets/images/posts/20261110/molecules-dark-800w.webp 2x, /assets/images/posts/20261110/molecules-dark-1200w.webp 3x"
    width="402" height="1518"
    type="image/webp"/>
  <source media="(min-width: 601px) and (max-width: 800px) and (prefers-color-scheme: dark)"
    srcset="/assets/images/posts/20261110/molecules-dark-800w.webp 1x, /assets/images/posts/20261110/molecules-dark-1600w.webp 2x, /assets/images/posts/20261110/molecules-dark@3x.webp 3x"
    width="402" height="1518"
    type="image/webp"/>
  <source media="(prefers-color-scheme: dark)" type="image/webp"
    srcset="/assets/images/posts/20261110/molecules-dark.webp 1x, /assets/images/posts/20261110/molecules-dark@2x.webp 2x, /assets/images/posts/20261110/molecules-dark@3x.webp 3x"
    width="402" height="1518"/>
  <source media="(max-width: 600px)"
    srcset="/assets/images/posts/20261110/molecules-400w.webp 1x, /assets/images/posts/20261110/molecules-800w.webp 2x, /assets/images/posts/20261110/molecules-1200w.webp 3x"
    type="image/webp"/>
  <source media="(min-width: 601px) and (max-width: 800px)"
    srcset="/assets/images/posts/20261110/molecules-800w.webp 1x, /assets/images/posts/20261110/molecules-1600w.webp 2x, /assets/images/posts/20261110/molecules@3x.webp 3x"
    type="image/webp"/>
  <source type="image/webp"
    srcset="/assets/images/posts/20261110/molecules.webp 1x, /assets/images/posts/20261110/molecules@2x.webp 2x, /assets/images/posts/20261110/molecules@3x.webp 3x"/>
  <img src="/assets/images/posts/20261110/molecules.webp"
    srcset="/assets/images/posts/20261110/molecules@2x.webp 2x, /assets/images/posts/20261110/molecules@3x.webp 3x"
    alt="The molecules of the InTransit redesign: larger components composed from the atoms"
    loading="lazy"
    width="402"
    height="1532"
    style="border-radius: 8px; max-width: 100%; height: auto;">
</picture>

Once these were composed, I wanted to then do a few critical things that always kept me from using InTransit properly, and so naturally other users definitely found it annoying too:
- **Search for stations**: This was needlessly separated into Stations and Places. The user would need to be mindful of which section they are searching in. Never a good idea. The new design unifies both, matches the name directly, and if nothing matches, it immediately begins to searching for places. 
- **Configuring a ride**: My second pain point: Selecting the departure and arrival stations quickly enough, that I can figure out my next *steps* in the real world based on the timing information. This is only possible if most of this information is presented to me upfront: i.e. no swiping, no taps, nothing. The app must recognize intent, not just taps. 
- **The Journey**: A lot of stations in India which are above ground are thick metal cages, leading to loss of GPS accuracy. This makes it hard for the app to determine if the user is actually at the station platform, outside of it, or somewhere else entirely. Determining this becomes harder still for underground stations. v2026.9 of InTransit employed motion detection to understand if you're walking or running towards the platform, or if you're in the metro carriages and moving towards your destination. v2026.11 now also uses the same technique to auto-start the journey for you. 
- **Better Timings**: Metro corporations across regions will have different timings, and special timings during civic holidays and festivities. A new timings system coordinates with these dynamic timings and I'll be putting more effort towards improving this information and data. 

{% render "video.html", base: "/assets/images/posts/20261110/stations-switch", width: 382, height: 140, hevc: "hvc1.2.4.L90.B0", av1: "av01.0.04M.10", label: "Switching the departure and arrival stations in InTransit" %}

{% render "video.html", base: "/assets/images/posts/20261110/trip-map", width: 402, height: 874, hevc: "hvc1.2.4.L123.B0", av1: "av01.0.09M.10", label: "The map following a trip from Kalyani Nagar in InTransit, above the trip details" %}

{% render "video.html", base: "/assets/images/posts/20261110/end-trip", width: 402, height: 544, hevc: "hvc1.2.4.L120.B0", av1: "av01.0.08M.10", label: "Ending a trip in InTransit, then opening the trip details" %}

InTransit's new design was built on top of these foundational molecules and organisms. The new design speaks for itself, feels fresh and causes less cognitive load while interacting with it. It is also now more robust than ever at handling complex inter-line transits. 

<aside>You may have also noted some common elements from <a href="https://pockity.app/ios" target="_blank" title="Pockity for iOS, iPadOS, and watchOS">Pockity</a> used in InTransit. Helps to have a shared UI library of components.</aside>

Thank you for reading this far, if you haven't already do check out the update on the [AppStore](https://apps.apple.com/us/app/intransit/id6756531079), and at the time of writing, it's the only app showing the newly active Pink Line from Pune 😉

--- 

For those curious about how the two designs and layouts compare, here's a full chart for your exploration:

| Name | Old | New |
| --- | --- | --- |
| Map | <img src="/assets/images/posts/20261110/compare/map-old-200w.webp" srcset="/assets/images/posts/20261110/compare/map-old-200w.webp 200w, /assets/images/posts/20261110/compare/map-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="The map in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/map-new-200w.webp" srcset="/assets/images/posts/20261110/compare/map-new-200w.webp 200w, /assets/images/posts/20261110/compare/map-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="The map in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Search | <img src="/assets/images/posts/20261110/compare/search-old-200w.webp" srcset="/assets/images/posts/20261110/compare/search-old-200w.webp 200w, /assets/images/posts/20261110/compare/search-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="Search in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/search-new-200w.webp" srcset="/assets/images/posts/20261110/compare/search-new-200w.webp 200w, /assets/images/posts/20261110/compare/search-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="Search in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Station Details | <img src="/assets/images/posts/20261110/compare/station-details-old-200w.webp" srcset="/assets/images/posts/20261110/compare/station-details-old-200w.webp 200w, /assets/images/posts/20261110/compare/station-details-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="Station details for Kalyani Nagar in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/station-details-new-200w.webp" srcset="/assets/images/posts/20261110/compare/station-details-new-200w.webp 200w, /assets/images/posts/20261110/compare/station-details-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="Station details for Kalyani Nagar in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Configuring a Ride | <img src="/assets/images/posts/20261110/compare/ride-setup-old-200w.webp" srcset="/assets/images/posts/20261110/compare/ride-setup-old-200w.webp 200w, /assets/images/posts/20261110/compare/ride-setup-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="Choosing the departure and arrival stations in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/ride-setup-new-200w.webp" srcset="/assets/images/posts/20261110/compare/ride-setup-new-200w.webp 200w, /assets/images/posts/20261110/compare/ride-setup-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="Choosing the departure and arrival stations in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Route Info | <img src="/assets/images/posts/20261110/compare/route-info-old-200w.webp" srcset="/assets/images/posts/20261110/compare/route-info-old-200w.webp 200w, /assets/images/posts/20261110/compare/route-info-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="Route information in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/route-info-new-200w.webp" srcset="/assets/images/posts/20261110/compare/route-info-new-200w.webp 200w, /assets/images/posts/20261110/compare/route-info-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="Route information in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Trip Details | <img src="/assets/images/posts/20261110/compare/trip-details-old-200w.webp" srcset="/assets/images/posts/20261110/compare/trip-details-old-200w.webp 200w, /assets/images/posts/20261110/compare/trip-details-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="Trip details during a ride in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/trip-details-new-200w.webp" srcset="/assets/images/posts/20261110/compare/trip-details-new-200w.webp 200w, /assets/images/posts/20261110/compare/trip-details-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="Trip details during a ride in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Live Activity | <img src="/assets/images/posts/20261110/compare/live-activity-old-200w.webp" srcset="/assets/images/posts/20261110/compare/live-activity-old-200w.webp 200w, /assets/images/posts/20261110/compare/live-activity-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="The Live Activity on the Lock Screen in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/live-activity-new-200w.webp" srcset="/assets/images/posts/20261110/compare/live-activity-new-200w.webp 200w, /assets/images/posts/20261110/compare/live-activity-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="The Live Activity on the Lock Screen in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| End Trip | <img src="/assets/images/posts/20261110/compare/end-trip-old-200w.webp" srcset="/assets/images/posts/20261110/compare/end-trip-old-200w.webp 200w, /assets/images/posts/20261110/compare/end-trip-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="The end of a trip in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/end-trip-new-200w.webp" srcset="/assets/images/posts/20261110/compare/end-trip-new-200w.webp 200w, /assets/images/posts/20261110/compare/end-trip-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="The end of a trip in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
| Travelogue | <img src="/assets/images/posts/20261110/compare/travelogue-old-200w.webp" srcset="/assets/images/posts/20261110/compare/travelogue-old-200w.webp 200w, /assets/images/posts/20261110/compare/travelogue-old-400w.webp 400w" sizes="200px" width="200" height="435" alt="The Travelogue in the old design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> | <img src="/assets/images/posts/20261110/compare/travelogue-new-200w.webp" srcset="/assets/images/posts/20261110/compare/travelogue-new-200w.webp 200w, /assets/images/posts/20261110/compare/travelogue-new-400w.webp 400w" sizes="200px" width="200" height="435" alt="The Travelogue in the new design of InTransit" loading="lazy" decoding="async" style="border-radius: 8px; max-width: 100%; height: auto;"> |
