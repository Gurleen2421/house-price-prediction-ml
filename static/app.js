/**
 * EstimaAI – House Price Predictor
 * JavaScript: Form handling, loading state, result animation
 * Flask integration: POST /predict → { predicted_price: number }
 */

'use strict';

// ── DOM references ───────────────────────────────────────────
const form        = document.getElementById('predictionForm');
const predictBtn  = document.getElementById('predictBtn');
const resultCard  = document.getElementById('resultCard');
const priceValue  = document.getElementById('priceValue');
const closeResult = document.getElementById('closeResult');
const priceCategory = document.getElementById('priceCategory');

// ── Validation ───────────────────────────────────────────────
const fieldRules = {
  med_income:      { label: 'Median Income',    min: 0,    max: 20    },
  house_age:       { label: 'House Age',         min: 1,    max: 100   },
  total_rooms:     { label: 'Total Rooms',       min: 1,    max: 40000 },
  total_bedrooms:  { label: 'Total Bedrooms',    min: 1,    max: 8000  },
  population:      { label: 'Population',        min: 1,    max: 40000 },
  households:      { label: 'Households',        min: 1,    max: 8000  },
  latitude:        { label: 'Latitude',          min: 32,   max: 42    },
  longitude:       { label: 'Longitude',         min: -125, max: -114  },
};

function validateForm() {
  let valid = true;

  for (const [id, rule] of Object.entries(fieldRules)) {
    const input = document.getElementById(id);
    const val   = parseFloat(input.value);
    input.classList.remove('error');

    if (input.value.trim() === '' || isNaN(val)) {
      input.classList.add('error');
      valid = false;
    } else if (val < rule.min || val > rule.max) {
      input.classList.add('error');
      valid = false;
    }
  }
  return valid;
}

// Clear error on user input
document.querySelectorAll('.field-input').forEach(input => {
  input.addEventListener('input', () => input.classList.remove('error'));
});

// ── Loading state ────────────────────────────────────────────
function setLoading(on) {
  predictBtn.disabled = on;
  predictBtn.classList.toggle('loading', on);
}

// ── Animated price counter ───────────────────────────────────
function animatePrice(target) {
  const duration = 1200;
  const steps    = 60;
  const stepTime = duration / steps;
  let   current  = target * 0.4;
  const increment = (target - current) / steps;

  priceValue.classList.add('animating');
  setTimeout(() => priceValue.classList.remove('animating'), 600);

  let step = 0;
  const timer = setInterval(() => {
    step++;
    current += increment;
    if (step >= steps) {
      current = target;
      clearInterval(timer);
    }
    priceValue.textContent = formatPrice(current);
  }, stepTime);
}

function formatPrice(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

// ── Price category tag ───────────────────────────────────────
function getPriceCategory(price) {
  if (price < 150_000) return '🏚️ Budget';
  if (price < 300_000) return '🏠 Mid-Range';
  if (price < 600_000) return '🏡 Premium';
  return '🏰 Luxury';
}

// ── Factor bars animation ────────────────────────────────────
function animateFactorBars() {
  const fills = document.querySelectorAll('.factor-fill');
  fills.forEach((fill, i) => {
    const targetWidth = fill.getAttribute('data-width');
    setTimeout(() => {
      fill.style.width = targetWidth + '%';
    }, 300 + i * 100);
  });
}

// ── Show result card ─────────────────────────────────────────
function showResult(price) {
  priceValue.textContent = '—';

  // Reset factor bar widths for re-animation
  document.querySelectorAll('.factor-fill').forEach(f => f.style.width = '0%');

  resultCard.classList.remove('visible');
  void resultCard.offsetWidth; // reflow

  // Set category
  const catText = getPriceCategory(price);
  const catIcon = priceCategory.querySelector('svg');
  priceCategory.lastChild.textContent = ' ' + catText;

  // Show card
  setTimeout(() => {
    resultCard.classList.add('visible');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);

  // Animate price after card appears
  setTimeout(() => animatePrice(price), 300);

  // Animate factor bars
  setTimeout(() => animateFactorBars(), 400);
}

// ── Close result ─────────────────────────────────────────────
closeResult.addEventListener('click', () => {
  resultCard.classList.remove('visible');
});

// ── Form submission ───────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    // Shake the invalid fields
    document.querySelectorAll('.field-input.error').forEach(input => {
      input.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(0)' },
      ], { duration: 350, easing: 'ease-out' });
    });
    return;
  }

  setLoading(true);

  // Collect form data
  const payload = {};
  for (const id of Object.keys(fieldRules)) {
    payload[id] = parseFloat(document.getElementById(id).value);
  }

  try {
    /**
     * Flask endpoint: POST /predict
     * Expected request body: { med_income, house_age, total_rooms,
     *   total_bedrooms, population, households, latitude, longitude }
     * Expected response: { predicted_price: number }
     */
    const response = await fetch('/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.predicted_price ?? data.price ?? data.result;

    if (typeof price !== 'number' || isNaN(price)) {
      throw new Error('Invalid prediction response from server.');
    }

    showResult(price);

  } catch (err) {
    /**
     * ── DEMO FALLBACK ──────────────────────────────────────
     * When no Flask server is running (e.g., static portfolio demo),
     * simulate a plausible prediction based on the inputs.
     * Remove this block in production.
     */
    console.warn('Flask server not reachable, using demo simulation:', err.message);

    const income    = parseFloat(document.getElementById('med_income').value)    || 3;
    const lat       = parseFloat(document.getElementById('latitude').value)      || 37;
    const lng       = parseFloat(document.getElementById('longitude').value)     || -120;
    const age       = parseFloat(document.getElementById('house_age').value)     || 25;
    const rooms     = parseFloat(document.getElementById('total_rooms').value)   || 500;
    const hh        = parseFloat(document.getElementById('households').value)    || 200;

    // Rough heuristic: income is the strongest predictor in this dataset
    const basePrice   = income * 45_000;
    const locFactor   = lat > 37 ? 1.3 : (lat < 34 ? 0.85 : 1.0); // Bay Area premium
    const agePenalty  = Math.max(0.7, 1 - (age - 10) * 0.004);
    const densityFactor = Math.min(1.2, rooms / hh / 4);
    const noise       = 0.93 + Math.random() * 0.14;

    const simPrice = Math.round(
      basePrice * locFactor * agePenalty * densityFactor * noise
    );

    showResult(simPrice);
  } finally {
    setLoading(false);
  }
});

// ── Keyboard shortcut: Enter on last field ───────────────────
document.getElementById('longitude').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
});

// ── Smooth entrance for prediction card ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Stagger the field groups on page load
  const groups = document.querySelectorAll('.field-group');
  groups.forEach((g, i) => {
    g.style.opacity = '0';
    g.style.transform = 'translateY(12px)';
    g.style.transition = `opacity 0.4s ease ${0.05 * i + 0.2}s, transform 0.4s ease ${0.05 * i + 0.2}s`;
    requestAnimationFrame(() => {
      g.style.opacity   = '1';
      g.style.transform = 'translateY(0)';
    });
  });
});