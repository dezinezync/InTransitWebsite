function startCountdown(elem) {
  let timeLeft = Number(elem.dataset.remaining ?? elem.dataset.interval);
  // Won't change till refreshed
  const locale = getLocale();

  var downloadTimer = setInterval(function() {
    if(timeLeft <= 0) {
      clearInterval(downloadTimer);
      elem.dataset.remaining = null;
      elem.dataset.start = null;
      elem.innerHTML = "00:00";
    } 
    else {
      if (!elem.dataset.start) {
        elem.dataset.start = +new Date();
      }

      let deadline = new Date(Number(elem.dataset.start) + (timeLeft * 1000));
      let formatted = formatCountdown(deadline, locale);
      // console.log({start: new Date(Number(elem.dataset.start)), deadline});
      elem.innerHTML = `${formatted}`;
    }
    timeLeft -= 1;
    timeLeft = Math.max(0, timeLeft);
    elem.dataset.remaining = timeLeft;
  }, 1 * 1000); // Update every 1000ms (1 second)
}

function getTimeRemaining(endTime) {
  const total = Date.parse(endTime) - new Date();
  if (total <= 0) return { 
    // days: 0, 
    // hours: 0, 
    minutes: 0, 
    seconds: 0, 
    total: 0 
  };
  
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  // const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  // const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, minutes, seconds };
}

function formatCountdown(targetDate, locale = 'en-US') {
  const time = getTimeRemaining(targetDate);

  if (time.total <= 0) {
    return new Intl.DateTimeFormat(locale).format(new Date(targetDate)) + ' - Expired';
  }

  const numberFormatter = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  const parts = [
    // `${time.days}d`,
    // `${numberFormatter.format(time.hours)}h`,
    `${numberFormatter.format(time.minutes)}`,
    `${numberFormatter.format(time.seconds)}`
  ];

  return parts.join(':');
}

function getLocale() {
  return (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
}

function setupIntersectionObservorForLiveActivities() {
  function startTimers() {
    console.info("Setting up timer updates");
    [...document.querySelectorAll("p[data-interval]")].forEach(elem => { startCountdown(elem); });

    // Stop observing the element after the script runs once
    observer.unobserve(targetElement);
  }

  // 2. Select the target element
  const targetElement = document.querySelector('#lva-grid');

  // 3. Configure the observer options (optional)
  const options = {
    root: null, // defaults to the browser viewport
    rootMargin: '0px',
    threshold: 0.1 // callback runs when 10% of the element is visible
  };

  // 4. Create the Intersection Observer instance
  const observer = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        // Check if the target element is intersecting (in view)
      if (entry.isIntersecting) {
        startTimers();
      }
    });
  }, options);

  // 5. Start observing the target element
  if (targetElement) {
    observer.observe(targetElement);
  }
}

document.addEventListener("readystatechange", (evt) => {
  if (document.readyState == "interactive") {
    setupIntersectionObservorForLiveActivities();
  }
});