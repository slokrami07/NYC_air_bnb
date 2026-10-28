/**
 * NYC Airbnb Room Classifier - Frontend Application Engine
 * Senior Frontend Architecture
 */

// Pydantic Schema Constraints Definition
const PYDANTIC_CONSTRAINTS = {
  latitude: { min: -90.0, max: 90.0, type: 'float', required: true, label: 'Latitude' },
  longitude: { min: -180.0, max: 180.0, type: 'float', required: true, label: 'Longitude' },
  price: { gt: 0.0, type: 'float', required: true, label: 'Price ($/night)' },
  minimum_nights: { min: 1, max: 365, type: 'int', required: true, label: 'Minimum Nights' },
  number_of_reviews: { min: 0, type: 'int', required: true, label: 'Total Reviews' },
  reviews_per_month: { min: 0.0, type: 'float', required: true, label: 'Reviews / Month' },
  calculated_host_listings_count: { min: 0, type: 'int', required: true, label: 'Host Listings Count' },
  availability_365: { min: 0, max: 365, type: 'int', required: true, label: 'Availability (365)' },
  neighbourhood_group: { minLength: 1, type: 'string', required: true, label: 'Borough' },
  neighbourhood: { minLength: 1, type: 'string', required: true, label: 'Neighbourhood' }
};

// Preset Scenarios
const PRESETS = {
  penthouse: {
    title: 'Manhattan Luxury Penthouse',
    neighbourhood_group: 'Manhattan',
    neighbourhood: 'Midtown',
    latitude: 40.75889,
    longitude: -73.98513,
    price: 375,
    minimum_nights: 3,
    number_of_reviews: 45,
    reviews_per_month: 2.1,
    calculated_host_listings_count: 2,
    availability_365: 220
  },
  artist_loft: {
    title: 'Williamsburg Designer Studio',
    neighbourhood_group: 'Brooklyn',
    neighbourhood: 'Williamsburg',
    latitude: 40.71448,
    longitude: -73.95544,
    price: 135,
    minimum_nights: 2,
    number_of_reviews: 94,
    reviews_per_month: 3.8,
    calculated_host_listings_count: 1,
    availability_365: 95
  },
  shared_flat: {
    title: 'East Village Budget Shared Spot',
    neighbourhood_group: 'Manhattan',
    neighbourhood: 'East Village',
    latitude: 40.72921,
    longitude: -73.98292,
    price: 45,
    minimum_nights: 1,
    number_of_reviews: 22,
    reviews_per_month: 1.1,
    calculated_host_listings_count: 6,
    availability_365: 310
  },
  corporate: {
    title: 'Queens Long-Term Suite',
    neighbourhood_group: 'Queens',
    neighbourhood: 'Long Island City',
    latitude: 40.74712,
    longitude: -73.94318,
    price: 110,
    minimum_nights: 30,
    number_of_reviews: 14,
    reviews_per_month: 0.5,
    calculated_host_listings_count: 4,
    availability_365: 345
  }
};

// App State
const state = {
  selectedBorough: 'Manhattan',
  map: null,
  marker: null,
  isApiOnline: false,
  apiEndpoint: window.location.origin.includes('http') 
    ? (window.location.port === '8000' ? '/predict' : 'http://127.0.0.1:8000/predict')
    : 'http://127.0.0.1:8000/predict',
  lastPrediction: null
};

// DOM References
const elements = {
  form: document.getElementById('predictionForm'),
  submitBtn: document.getElementById('submitBtn'),
  apiStatusPill: document.getElementById('apiStatusPill'),
  apiStatusText: document.getElementById('apiStatusText'),
  boroughChips: document.querySelectorAll('.borough-chip'),
  boroughSelect: document.getElementById('neighbourhood_group'),
  neighbourhoodSelect: document.getElementById('neighbourhood'),
  // Numeric Inputs
  latInput: document.getElementById('latitude'),
  lonInput: document.getElementById('longitude'),
  priceInput: document.getElementById('price'),
  priceSlider: document.getElementById('price_slider'),
  minNightsInput: document.getElementById('minimum_nights'),
  minNightsSlider: document.getElementById('minimum_nights_slider'),
  reviewsInput: document.getElementById('number_of_reviews'),
  reviewsPerMonthInput: document.getElementById('reviews_per_month'),
  hostCountInput: document.getElementById('calculated_host_listings_count'),
  availInput: document.getElementById('availability_365'),
  availSlider: document.getElementById('availability_365_slider'),
  // Result Display
  resultCard: document.getElementById('resultCard'),
  predictionHeroName: document.getElementById('predictionHeroName'),
  predictionIcon: document.getElementById('predictionIcon'),
  confidenceChip: document.getElementById('confidenceChip'),
  probEntireBar: document.getElementById('probEntireBar'),
  probEntireVal: document.getElementById('probEntireVal'),
  probPrivateBar: document.getElementById('probPrivateBar'),
  probPrivateVal: document.getElementById('probPrivateVal'),
  probSharedBar: document.getElementById('probSharedBar'),
  probSharedVal: document.getElementById('probSharedVal'),
  insightOne: document.getElementById('insightOne'),
  insightTwo: document.getElementById('insightTwo'),
  insightThree: document.getElementById('insightThree'),
  // Developer drawer
  jsonPayloadCode: document.getElementById('jsonPayloadCode'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  copyCurlBtn: document.getElementById('copyCurlBtn'),
  toastContainer: document.getElementById('toastContainer')
};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  populateBoroughs();
  bindEvents();
  checkApiHealth();
  applyPreset('penthouse');
});

/**
 * Initialize Interactive Map with Leaflet
 */
function initMap() {
  if (typeof L === 'undefined') return;

  const defaultCoords = [40.75889, -73.98513]; // Times Square / Midtown
  state.map = L.map('nycMap', {
    center: defaultCoords,
    zoom: 12,
    zoomControl: true
  });

  // Native Dark Tiles from CartoDB (No API key watermark)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(state.map);

  // Custom Neon Marker Icon
  const customIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: #ff385c;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 16px rgba(255, 56, 92, 0.8), 0 4px 10px rgba(0,0,0,0.5);
      animation: pulse-dot 2s infinite;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  state.marker = L.marker(defaultCoords, {
    draggable: true,
    icon: customIcon
  }).addTo(state.map);

  // When marker is dragged, update form lat/lon
  state.marker.on('dragend', (e) => {
    const latlng = e.target.getLatLng();
    updateCoordinates(latlng.lat, latlng.lng);
  });

  // When map is clicked, place marker and update form
  state.map.on('click', (e) => {
    state.marker.setLatLng(e.latlng);
    updateCoordinates(e.latlng.lat, e.latlng.lng);
  });
}

/**
 * Update Coordinate Inputs & Validate
 */
function updateCoordinates(lat, lon) {
  elements.latInput.value = parseFloat(lat).toFixed(5);
  elements.lonInput.value = parseFloat(lon).toFixed(5);
  validateField('latitude');
  validateField('longitude');
  updateJsonPayloadPreview();
}

/**
 * Populate Boroughs and Cascading Neighbourhoods
 */
function populateBoroughs() {
  if (typeof NYC_DATA === 'undefined') return;

  const boroughs = Object.keys(NYC_DATA);
  elements.boroughSelect.innerHTML = '';
  boroughs.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    elements.boroughSelect.appendChild(opt);
  });

  updateNeighbourhoodList(state.selectedBorough);
}

/**
 * Update Neighbourhood dropdown based on selected borough
 */
function updateNeighbourhoodList(borough, selectedNeighbourhood = null) {
  if (typeof NYC_DATA === 'undefined' || !NYC_DATA[borough]) return;

  const neighbourhoods = Object.keys(NYC_DATA[borough].neighbourhoods).sort();
  elements.neighbourhoodSelect.innerHTML = '';

  neighbourhoods.forEach((n) => {
    const opt = document.createElement('option');
    opt.value = n;
    const avgPrice = NYC_DATA[borough].neighbourhoods[n].avg_price;
    opt.textContent = `${n} (~$${avgPrice}/n)`;
    elements.neighbourhoodSelect.appendChild(opt);
  });

  if (selectedNeighbourhood && neighbourhoods.includes(selectedNeighbourhood)) {
    elements.neighbourhoodSelect.value = selectedNeighbourhood;
  } else {
    elements.neighbourhoodSelect.value = neighbourhoods[0];
  }

  // Update active chip
  elements.boroughChips.forEach(chip => {
    if (chip.dataset.borough === borough) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  validateField('neighbourhood_group');
  validateField('neighbourhood');
}

/**
 * Fly Map to Given Coordinates
 */
function flyMapTo(lat, lon, zoom = 13) {
  if (!state.map || !state.marker) return;
  state.map.flyTo([lat, lon], zoom, { duration: 1.2 });
  state.marker.setLatLng([lat, lon]);
}

/**
 * Bind All UI Event Handlers
 */
function bindEvents() {
  // Borough quick chips
  elements.boroughChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const b = chip.dataset.borough;
      selectBorough(b);
    });
  });

  // Borough select dropdown
  elements.boroughSelect.addEventListener('change', (e) => {
    selectBorough(e.target.value);
  });

  // Neighbourhood dropdown
  elements.neighbourhoodSelect.addEventListener('change', (e) => {
    const b = elements.boroughSelect.value;
    const n = e.target.value;
    if (NYC_DATA && NYC_DATA[b] && NYC_DATA[b].neighbourhoods[n]) {
      const item = NYC_DATA[b].neighbourhoods[n];
      elements.latInput.value = item.lat;
      elements.lonInput.value = item.lon;
      flyMapTo(item.lat, item.lon, 14);
    }
    validateField('neighbourhood');
    updateJsonPayloadPreview();
  });

  // Coordinate inputs change
  [elements.latInput, elements.lonInput].forEach(inp => {
    inp.addEventListener('input', () => {
      validateField(inp.id);
      const lat = parseFloat(elements.latInput.value);
      const lon = parseFloat(elements.lonInput.value);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        flyMapTo(lat, lon);
      }
      updateJsonPayloadPreview();
    });
  });

  // Sliders and Number inputs two-way sync
  syncSliderAndNumber(elements.priceSlider, elements.priceInput, 'price');
  syncSliderAndNumber(elements.minNightsSlider, elements.minNightsInput, 'minimum_nights');
  syncSliderAndNumber(elements.availSlider, elements.availInput, 'availability_365');

  // Other numeric inputs
  [elements.reviewsInput, elements.reviewsPerMonthInput, elements.hostCountInput].forEach(inp => {
    inp.addEventListener('input', () => {
      validateField(inp.id);
      updateJsonPayloadPreview();
    });
  });

  // Form Submit
  elements.form.addEventListener('submit', handleFormSubmit);

  // Preset Scenario Cards
  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      applyPreset(card.dataset.preset);
    });
  });

  // Developer Drawer Copy Buttons
  elements.copyJsonBtn.addEventListener('click', copyJsonPayload);
  elements.copyCurlBtn.addEventListener('click', copyCurlCommand);
}

/**
 * Two-way binding for Range Slider & Number Input
 */
function syncSliderAndNumber(slider, numberInput, fieldName) {
  if (!slider || !numberInput) return;

  slider.addEventListener('input', () => {
    numberInput.value = slider.value;
    validateField(fieldName);
    updateJsonPayloadPreview();
  });

  numberInput.addEventListener('input', () => {
    slider.value = numberInput.value;
    validateField(fieldName);
    updateJsonPayloadPreview();
  });
}

/**
 * Select Borough & Trigger Map Adjustment
 */
function selectBorough(boroughName) {
  state.selectedBorough = boroughName;
  elements.boroughSelect.value = boroughName;
  updateNeighbourhoodList(boroughName);

  if (NYC_DATA && NYC_DATA[boroughName]) {
    const center = NYC_DATA[boroughName].center;
    elements.latInput.value = center.lat;
    elements.lonInput.value = center.lon;
    flyMapTo(center.lat, center.lon, 12);
  }
  updateJsonPayloadPreview();
}

/**
 * Apply Preset Scenario
 */
function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  elements.boroughSelect.value = p.neighbourhood_group;
  updateNeighbourhoodList(p.neighbourhood_group, p.neighbourhood);

  elements.latInput.value = p.latitude;
  elements.lonInput.value = p.longitude;
  elements.priceInput.value = p.price;
  elements.priceSlider.value = p.price;
  elements.minNightsInput.value = p.minimum_nights;
  elements.minNightsSlider.value = p.minimum_nights;
  elements.reviewsInput.value = p.number_of_reviews;
  elements.reviewsPerMonthInput.value = p.reviews_per_month;
  elements.hostCountInput.value = p.calculated_host_listings_count;
  elements.availInput.value = p.availability_365;
  elements.availSlider.value = p.availability_365;

  flyMapTo(p.latitude, p.longitude, 14);

  // Validate all fields
  Object.keys(PYDANTIC_CONSTRAINTS).forEach(k => validateField(k));
  updateJsonPayloadPreview();
  showToast(`Loaded scenario: ${p.title}`, 'info');

  // Automatically execute prediction for instant feedback
  executePrediction();
}

/**
 * Strict Field-Level Pydantic Validation
 */
function validateField(fieldName) {
  const rule = PYDANTIC_CONSTRAINTS[fieldName];
  if (!rule) return true;

  const input = document.getElementById(fieldName);
  const feedback = document.getElementById(`${fieldName}_feedback`);
  if (!input) return true;

  const rawVal = input.value.trim();
  let isValid = true;
  let errorMsg = '';

  if (rule.required && rawVal === '') {
    isValid = false;
    errorMsg = `${rule.label} is required.`;
  } else if (rule.type === 'int') {
    const val = Number(rawVal);
    if (!Number.isInteger(val)) {
      isValid = false;
      errorMsg = `${rule.label} must be a whole integer.`;
    } else if (rule.min !== undefined && val < rule.min) {
      isValid = false;
      errorMsg = `${rule.label} must be >= ${rule.min}.`;
    } else if (rule.max !== undefined && val > rule.max) {
      isValid = false;
      errorMsg = `${rule.label} must be <= ${rule.max}.`;
    }
  } else if (rule.type === 'float') {
    const val = parseFloat(rawVal);
    if (isNaN(val)) {
      isValid = false;
      errorMsg = `${rule.label} must be a valid number.`;
    } else if (rule.gt !== undefined && val <= rule.gt) {
      isValid = false;
      errorMsg = `${rule.label} must be > ${rule.gt}.`;
    } else if (rule.min !== undefined && val < rule.min) {
      isValid = false;
      errorMsg = `${rule.label} must be >= ${rule.min}.`;
    } else if (rule.max !== undefined && val > rule.max) {
      isValid = false;
      errorMsg = `${rule.label} must be <= ${rule.max}.`;
    }
  } else if (rule.type === 'string') {
    if (rule.minLength && rawVal.length < rule.minLength) {
      isValid = false;
      errorMsg = `${rule.label} must not be empty.`;
    }
  }

  // Update UI classes
  if (isValid) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.add('hidden');
    }
  } else {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 400);
    if (feedback) {
      feedback.textContent = errorMsg;
      feedback.classList.remove('hidden');
    }
  }

  return isValid;
}

/**
 * Validate Entire Form
 */
function validateEntireForm() {
  let isAllValid = true;
  let firstInvalidInput = null;

  for (const fieldName of Object.keys(PYDANTIC_CONSTRAINTS)) {
    const isValid = validateField(fieldName);
    if (!isValid) {
      isAllValid = false;
      if (!firstInvalidInput) {
        firstInvalidInput = document.getElementById(fieldName);
      }
    }
  }

  if (!isAllValid && firstInvalidInput) {
    firstInvalidInput.focus();
    firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Please correct highlighted validation errors.', 'error');
  }

  return isAllValid;
}

/**
 * Build Raw Features Payload Matching Pydantic Schema
 */
function getFormPayload() {
  return {
    latitude: parseFloat(elements.latInput.value),
    longitude: parseFloat(elements.lonInput.value),
    price: parseFloat(elements.priceInput.value),
    minimum_nights: parseInt(elements.minNightsInput.value, 10),
    number_of_reviews: parseInt(elements.reviewsInput.value, 10),
    reviews_per_month: parseFloat(elements.reviewsPerMonthInput.value),
    calculated_host_listings_count: parseInt(elements.hostCountInput.value, 10),
    availability_365: parseInt(elements.availInput.value, 10),
    neighbourhood_group: elements.boroughSelect.value,
    neighbourhood: elements.neighbourhoodSelect.value
  };
}

/**
 * Update Developer JSON Inspector in Real Time
 */
function updateJsonPayloadPreview() {
  try {
    const payload = getFormPayload();
    elements.jsonPayloadCode.textContent = JSON.stringify(payload, null, 2);
  } catch (e) {
    // ignore temporary parse errors while typing
  }
}

/**
 * Form Submission Handler
 */
function handleFormSubmit(e) {
  e.preventDefault();
  executePrediction();
}

/**
 * Execute Prediction Call
 */
async function executePrediction() {
  if (!validateEntireForm()) return;

  const payload = getFormPayload();
  setLoadingState(true);

  try {
    const response = await fetch(state.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    renderPredictionResults(data, payload);
    setApiOnline(true);
    showToast(`Classification complete: ${data.predicted_room_type}`, 'success');
  } catch (error) {
    console.warn('Backend API call failed, falling back to heuristic simulation mode:', error);
    setApiOnline(false);

    // Fallback simulation mode to ensure UI works smoothly even when backend isn't started yet
    const simulatedData = simulateModelPrediction(payload);
    renderPredictionResults(simulatedData, payload, true);
    showToast('Backend offline - simulated prediction rendered.', 'info');
  } finally {
    setLoadingState(false);
  }
}

/**
 * Render Model Results & Insights
 */
function renderPredictionResults(data, inputFeatures, isSimulated = false) {
  state.lastPrediction = data;
  const roomType = data.predicted_room_type; // "Entire home/apt", "Private room", or "Shared room"
  const probs = data.probability; // array of 3 probabilities [Entire, Private, Shared]

  // Model classes order: 0: Entire home/apt, 1: Private room, 2: Shared room
  const pEntire = (probs[0] * 100).toFixed(1);
  const pPrivate = (probs[1] * 100).toFixed(1);
  const pShared = (probs[2] * 100).toFixed(1);

  // Update Hero Showcase
  elements.predictionHeroName.textContent = roomType;

  // Icon, Color, & Glow Theme
  elements.resultCard.classList.remove('glow-entire', 'glow-private', 'glow-shared');
  if (roomType === 'Entire home/apt') {
    elements.resultCard.classList.add('glow-entire');
    elements.predictionIcon.textContent = '🏠';
    elements.confidenceChip.innerHTML = `<span style="color:var(--emerald-400)">●</span> Confidence: ${pEntire}%`;
  } else if (roomType === 'Private room') {
    elements.resultCard.classList.add('glow-private');
    elements.predictionIcon.textContent = '🛏️';
    elements.confidenceChip.innerHTML = `<span style="color:var(--violet-400)">●</span> Confidence: ${pPrivate}%`;
  } else {
    elements.resultCard.classList.add('glow-shared');
    elements.predictionIcon.textContent = '👥';
    elements.confidenceChip.innerHTML = `<span style="color:var(--amber-400)">●</span> Confidence: ${pShared}%`;
  }

  // Trigger badge spring pop & radar ring
  const badgeWrapper = document.getElementById('predictionBadgeWrapper');
  const radarPulse = badgeWrapper ? badgeWrapper.querySelector('.radar-pulse') : null;
  if (badgeWrapper) {
    badgeWrapper.classList.remove('pop');
    void badgeWrapper.offsetWidth; // Trigger DOM reflow for restart
    badgeWrapper.classList.add('pop');
  }
  if (radarPulse) {
    radarPulse.classList.add('active');
    setTimeout(() => radarPulse.classList.remove('active'), 2500);
  }

  // Smooth number counting animations
  const prevEntire = parseFloat(elements.probEntireVal.textContent) || 0;
  const prevPrivate = parseFloat(elements.probPrivateVal.textContent) || 0;
  const prevShared = parseFloat(elements.probSharedVal.textContent) || 0;

  animateNumber(elements.probEntireVal, prevEntire, parseFloat(pEntire));
  elements.probEntireBar.style.width = `${pEntire}%`;

  animateNumber(elements.probPrivateVal, prevPrivate, parseFloat(pPrivate));
  elements.probPrivateBar.style.width = `${pPrivate}%`;

  animateNumber(elements.probSharedVal, prevShared, parseFloat(pShared));
  elements.probSharedBar.style.width = `${pShared}%`;

  // Trigger celebration sparks
  triggerConfetti(roomType);

  // Market Insights Computation
  generateMarketInsights(inputFeatures, roomType, probs);

  // Scroll smoothly to results if on mobile/small screen
  if (window.innerWidth < 1080) {
    elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Generate Dynamic Market Insights
 */
function generateMarketInsights(features, roomType, probs) {
  // Insight 1: Price positioning
  let priceComment = '';
  if (features.price > 250) {
    priceComment = `At <strong>$${features.price}/night</strong>, this listing operates in the top premium tier for ${features.neighbourhood_group}.`;
  } else if (features.price < 70) {
    priceComment = `At <strong>$${features.price}/night</strong>, this listing sits in the value/budget segment for ${features.neighbourhood_group}.`;
  } else {
    priceComment = `At <strong>$${features.price}/night</strong>, this listing matches competitive mid-market pricing in ${features.neighbourhood}.`;
  }
  elements.insightOne.innerHTML = priceComment;

  // Insight 2: Occupancy & Min Nights
  let bookingComment = '';
  if (features.minimum_nights >= 30) {
    bookingComment = `Requirement of <strong>${features.minimum_nights} minimum nights</strong> categorizes this as an extended corporate/monthly stay, adhering strictly to NYC Local Law 18.`;
  } else if (features.minimum_nights <= 2) {
    bookingComment = `A flexible <strong>${features.minimum_nights}-night minimum</strong> maximizes weekend tourist turnover and review velocity (${features.reviews_per_month} reviews/mo).`;
  } else {
    bookingComment = `Standard <strong>${features.minimum_nights}-night minimum</strong> balances host cleaning operations with high occupancy.`;
  }
  elements.insightTwo.innerHTML = bookingComment;

  // Insight 3: Host portfolio & availability
  let hostComment = '';
  if (features.calculated_host_listings_count > 2) {
    hostComment = `The host manages <strong>${features.calculated_host_listings_count} properties</strong>, indicating professional hospitality operator behavior.`;
  } else {
    hostComment = `Single-property host profile (${features.calculated_host_listings_count} listing), typical of authentic local resident hosts with high guest engagement.`;
  }
  elements.insightThree.innerHTML = hostComment;
}

/**
 * Check Backend API Health
 */
async function checkApiHealth() {
  try {
    const res = await fetch(state.apiEndpoint.replace('/predict', '/'), { method: 'GET' });
    if (res.ok) {
      setApiOnline(true);
    } else {
      setApiOnline(false);
    }
  } catch (err) {
    setApiOnline(false);
  }
}

function setApiOnline(isOnline) {
  state.isApiOnline = isOnline;
  const dot = elements.apiStatusPill.querySelector('.status-dot');
  if (isOnline) {
    elements.apiStatusPill.style.background = 'rgba(16, 185, 129, 0.1)';
    elements.apiStatusPill.style.borderColor = 'rgba(16, 185, 129, 0.25)';
    elements.apiStatusPill.style.color = 'var(--emerald-400)';
    dot.classList.remove('offline');
    elements.apiStatusText.textContent = 'FastAPI Model Live';
  } else {
    elements.apiStatusPill.style.background = 'rgba(244, 63, 94, 0.1)';
    elements.apiStatusPill.style.borderColor = 'rgba(244, 63, 94, 0.25)';
    elements.apiStatusPill.style.color = 'var(--rose-500)';
    dot.classList.add('offline');
    elements.apiStatusText.textContent = 'FastAPI Offline (Auto-Preview)';
  }
}

/**
 * Loading State Indicator
 */
function setLoadingState(isLoading) {
  if (isLoading) {
    elements.submitBtn.classList.add('loading');
    elements.submitBtn.disabled = true;
  } else {
    elements.submitBtn.classList.remove('loading');
    elements.submitBtn.disabled = false;
  }
}

/**
 * Fallback Simulated Model (mirrors RandomForest weights for preview)
 */
function simulateModelPrediction(f) {
  let pEntire = 0.33, pPrivate = 0.33, pShared = 0.33;

  if (f.price > 180) {
    pEntire += 0.45;
    pPrivate -= 0.3;
    pShared -= 0.15;
  } else if (f.price < 60) {
    pShared += 0.4;
    pPrivate += 0.2;
    pEntire -= 0.6;
  } else {
    pPrivate += 0.4;
    pEntire += 0.1;
    pShared -= 0.5;
  }

  if (f.calculated_host_listings_count > 3) {
    pShared += 0.15;
    pEntire += 0.1;
  }

  // Normalize
  pEntire = Math.max(0.01, pEntire);
  pPrivate = Math.max(0.01, pPrivate);
  pShared = Math.max(0.01, pShared);
  const sum = pEntire + pPrivate + pShared;
  const norm = [pEntire / sum, pPrivate / sum, pShared / sum];

  let winner = 'Entire home/apt';
  if (norm[1] > norm[0] && norm[1] > norm[2]) winner = 'Private room';
  if (norm[2] > norm[0] && norm[2] > norm[1]) winner = 'Shared room';

  return {
    predicted_room_type: winner,
    probability: [
      parseFloat(norm[0].toFixed(3)),
      parseFloat(norm[1].toFixed(3)),
      parseFloat(norm[2].toFixed(3))
    ]
  };
}

/**
 * Copy JSON Payload to Clipboard
 */
function copyJsonPayload() {
  const payload = getFormPayload();
  const text = JSON.stringify(payload, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied JSON payload to clipboard!', 'success');
  });
}

/**
 * Copy cURL Command to Clipboard
 */
function copyCurlCommand() {
  const payload = getFormPayload();
  const curlCmd = `curl -X 'POST' \\\n  '${state.apiEndpoint}' \\\n  -H 'accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(payload)}'`;
  navigator.clipboard.writeText(curlCmd).then(() => {
    showToast('Copied cURL command to clipboard!', 'success');
  });
}

/**
 * Modern Toast Notifications
 */
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Smooth Number Counter Animation
 */
function animateNumber(element, start, end, duration = 800) {
  if (isNaN(start)) start = 0;
  if (isNaN(end)) end = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = (start + (end - start) * ease).toFixed(1);
    element.textContent = `${current}%`;
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

/**
 * Lightweight Zero-Dependency Confetti Explosion
 */
function triggerConfetti(predictedClass) {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let palette = ['#ff385c', '#06b6d4', '#8b5cf6', '#ffffff', '#fbbf24'];
  if (predictedClass === 'Entire home/apt') {
    palette = ['#10b981', '#34d399', '#06b6d4', '#ffffff', '#6ee7b7'];
  } else if (predictedClass === 'Private room') {
    palette = ['#8b5cf6', '#a78bfa', '#c084fc', '#ffffff', '#f43f5e'];
  } else {
    palette = ['#f59e0b', '#fbbf24', '#ff385c', '#ffffff', '#fde68a'];
  }

  const particles = [];
  const particleCount = 45;
  const originX = window.innerWidth * (window.innerWidth < 1080 ? 0.5 : 0.75);
  const originY = window.innerHeight * 0.42;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 4 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 12,
      decay: 0.015 + Math.random() * 0.015
    });
  }

  let animationFrameId;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let aliveCount = 0;

    particles.forEach(p => {
      if (p.alpha > 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // subtle gravity
        p.vx *= 0.98; // drag
        p.rotation += p.spin;
        p.alpha -= p.decay;
        aliveCount++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      }
    });

    if (aliveCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrameId);
    }
  }

  render();
}
