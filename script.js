// Unified SkyCast script for Weather and Forex

// --- THEME LOGIC ---
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateToggleIcon(savedTheme);

    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateToggleIcon(newTheme);
    });

    function updateToggleIcon(theme) {
        if (!themeToggle) return;
        const icon = theme === 'dark' ? 'sun' : 'moon';
        themeToggle.innerHTML = `<i data-lucide="${icon}"></i>`;
        lucide.createIcons();
    }
}

// --- COMMON UTILS ---
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// --- WEATHER LOGIC ---
function initWeather() {
    const statusEl = document.getElementById('status');
    const weatherCard = document.getElementById('weather');
    const locationEl = document.getElementById('location');
    const tempEl = document.getElementById('temperature');
    const descEl = document.getElementById('description');
    const mainIconEl = document.getElementById('main-icon');

    if (!weatherCard) return;

    function weatherCodeToInfo(code) {
        const map = {
            0: ['Clear sky', 'sun'],
            1: ['Mainly clear', 'cloud-sun'],
            2: ['Partly cloudy', 'cloud'],
            3: ['Overcast', 'cloud'],
            45: ['Fog', 'cloud-fog'],
            48: ['Fog', 'cloud-fog'],
            51: ['Light drizzle', 'cloud-drizzle'],
            53: ['Drizzle', 'cloud-drizzle'],
            55: ['Dense drizzle', 'cloud-drizzle'],
            61: ['Slight rain', 'cloud-rain'],
            63: ['Moderate rain', 'cloud-rain'],
            65: ['Heavy rain', 'cloud-rain'],
            71: ['Slight snow', 'cloud-snow'],
            73: ['Snow fall', 'cloud-snow'],
            75: ['Heavy snow', 'cloud-snow'],
            80: ['Rain showers', 'cloud-rain'],
            81: ['Rain showers', 'cloud-rain'],
            82: ['Rain showers', 'cloud-rain'],
            95: ['Thunderstorm', 'cloud-lightning'],
        };
        return map[code] || ['Unknown', 'help-circle'];
    }

    function generateInsight(data) {
        const code = data.current_weather.weathercode;
        const temp = data.current_weather.temperature;
        const wind = data.current_weather.windspeed;
        
        let insight = "";
        if (code === 0) insight = "It's a perfect day for outdoor activities.";
        else if (code <= 3) insight = "A bit of cloud, but still great for a walk.";
        else if (code >= 95) insight = "Thunderstorms ahead! Better stay indoors.";
        else if (code >= 51) insight = "Don't forget your umbrella today.";
        else insight = "Weather seems stable for the next few hours.";

        if (temp > 30) insight += " Remember to stay hydrated.";
        if (wind > 20) insight += " Expect some strong winds.";
        
        return insight;
    }

    function showWeather(data) {
        const { temperature, weathercode, windspeed } = data.current_weather;
        const city = data.timezone.split('/')[1].replace('_', ' ');
        const [description, iconName] = weatherCodeToInfo(weathercode);

        locationEl.textContent = city;
        tempEl.textContent = `${Math.round(temperature)}°C`;
        descEl.textContent = description;
        mainIconEl.innerHTML = `<i data-lucide="${iconName}" size="64" class="float-icon"></i>`;
        
        // Update new insights
        document.getElementById('daily-insight').textContent = generateInsight(data);
        document.getElementById('humidity').textContent = `${data.hourly.relative_humidity_2m[0]}%`;
        document.getElementById('wind-speed').textContent = `${Math.round(windspeed)} km/h`;
        document.getElementById('feels-like').textContent = `${Math.round(data.hourly.apparent_temperature[0])}°`;

        weatherCard.classList.remove('hidden');
        weatherCard.classList.add('animate-slide-up');
        statusEl.textContent = 'Last updated: Just now';
        lucide.createIcons();
    }

    function fetchWeather(lat, lon) {
        // Expanded URL to get humidity and apparent temperature
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m,apparent_temperature&timezone=auto`;
        statusEl.textContent = 'Updating...';
        fetch(url)
            .then((res) => res.json())
            .then((data) => showWeather(data))
            .catch((err) => {
                statusEl.textContent = 'Failed to load weather data.';
                console.error(err);
            });
    }

    // Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => statusEl.textContent = 'Search for a city to see the weather.'
        );
    }

    // Search
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');
    const handleSearch = () => {
        const city = cityInput.value.trim();
        if (city) {
            statusEl.textContent = `Searching for ${city}...`;
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)
                .then(res => res.json())
                .then(data => {
                    if (data.results?.length > 0) {
                        fetchWeather(data.results[0].latitude, data.results[0].longitude);
                    } else {
                        statusEl.textContent = `City "${city}" not found.`;
                    }
                });
        }
    };
    searchBtn?.addEventListener('click', handleSearch);
    cityInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());

    // Search Suggestions Logic
    const suggestionsEl = document.getElementById('suggestions');
    let debounceTimer;

    const fetchSuggestions = (query) => {
        if (query.length < 2) {
            suggestionsEl.classList.add('hidden');
            return;
        }

        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`)
            .then(res => res.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    suggestionsEl.innerHTML = data.results.map(res => `
                        <div class="suggestion-item" data-lat="${res.latitude}" data-lon="${res.longitude}" data-name="${res.name}">
                            <span class="city-name">${res.name}</span>
                            <span class="country-name">${res.admin1 ? res.admin1 + ', ' : ''}${res.country}</span>
                        </div>
                    `).join('');
                    suggestionsEl.classList.remove('hidden');

                    // Click handler for suggestions
                    document.querySelectorAll('.suggestion-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const lat = item.getAttribute('data-lat');
                            const lon = item.getAttribute('data-lon');
                            const name = item.getAttribute('data-name');
                            cityInput.value = name;
                            suggestionsEl.classList.add('hidden');
                            fetchWeather(lat, lon);
                        });
                    });
                } else {
                    suggestionsEl.classList.add('hidden');
                }
            })
            .catch(() => suggestionsEl.classList.add('hidden'));
    };

    cityInput?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchSuggestions(e.target.value), 300);
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            suggestionsEl.classList.add('hidden');
        }
    });

    // Popular places
    ['Mbabane', 'Manzini', 'Lobamba'].forEach(city => {
        const card = document.getElementById(`place-${city}`);
        card?.addEventListener('click', () => {
            statusEl.textContent = `Fetching ${city}...`;
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)
                .then(res => res.json())
                .then(data => fetchWeather(data.results[0].latitude, data.results[0].longitude));
        });

        // Initial mini-fetch for cards
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)
            .then(res => res.json())
            .then(data => {
                const { latitude, longitude } = data.results[0];
                return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
            })
            .then(res => res.json())
            .then(wd => {
                const { temperature, weathercode } = wd.current_weather;
                const [_, iconName] = weatherCodeToInfo(weathercode);
                document.getElementById(`temp-${city}`).textContent = `${Math.round(temperature)}°`;
                document.getElementById(`icon-${city}`).innerHTML = `<i data-lucide="${iconName}" size="20"></i>`;
                lucide.createIcons();
            });
    });
}

// --- FOREX LOGIC ---
function initForex() {
    const statusEl = document.getElementById('forex-status');
    const mainRateEl = document.getElementById('main-rate');
    const ctx = document.getElementById('growthChart')?.getContext('2d');
    const chartTitle = document.getElementById('chart-title');
    const chartBase = document.getElementById('chart-base');
    const chartTarget = document.getElementById('chart-target');

    if (!mainRateEl) return;

    let allRates = {};

    // Fetch current rates from ExchangeRate-API
    function fetchCurrentRates() {
        const base = chartBase.value;
        const target = chartTarget.value;
        
        fetch(`https://open.er-api.com/v6/latest/${base}`)
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success') {
                    allRates = data.rates;
                    mainRateEl.textContent = data.rates[target].toFixed(4);
                    chartTitle.textContent = `${base}/${target} Trend`;
                    
                    // Update grid if base is USD (standard view)
                    if (base === 'USD') {
                        if (document.getElementById('rate-GBP')) document.getElementById('rate-GBP').textContent = data.rates.GBP.toFixed(4);
                        if (document.getElementById('rate-JPY')) document.getElementById('rate-JPY').textContent = data.rates.JPY.toFixed(2);
                        if (document.getElementById('rate-ZAR')) document.getElementById('rate-ZAR').textContent = data.rates.ZAR.toFixed(2);
                    }
                    
                    statusEl.textContent = `Market Data Updated: ${new Date().toLocaleTimeString()}`;
                    updateConversion();
                }
            })
            .catch(() => statusEl.textContent = 'Failed to load live rates.');
    }

    // Event listeners for chart controls
    [chartBase, chartTarget].forEach(el => {
        el.addEventListener('change', () => {
            fetchCurrentRates();
            initChart();
        });
    });

    // --- Converter Logic ---
    const amountInput = document.getElementById('convert-amount');
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');
    const resultDisplay = document.getElementById('convert-result');
    const swapBtn = document.getElementById('swap-currencies');

    function updateConversion() {
        if (!allRates || Object.keys(allRates).length === 0) return;
        
        const amount = parseFloat(amountInput.value) || 0;
        const from = fromSelect.value;
        const to = toSelect.value;

        // Calculate rate relative to USD base
        const rate = allRates[to] / allRates[from];
        const result = amount * rate;
        
        resultDisplay.textContent = result.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    }

    if (amountInput) {
        [amountInput, fromSelect, toSelect].forEach(el => {
            el.addEventListener('input', updateConversion);
        });

        swapBtn.addEventListener('click', () => {
            const temp = fromSelect.value;
            fromSelect.value = toSelect.value;
            toSelect.value = temp;
            updateConversion();
        });
    }

    // Fetch historical data for the graph
    function initChart() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const startStr = formatDate(firstDay);
        const endStr = formatDate(now);
        const base = chartBase.value;
        const target = chartTarget.value;

        // Try Frankfurter for historical data
        fetch(`https://api.frankfurter.app/${startStr}..${endStr}?from=${base}&to=${target}`)
            .then(res => res.json())
            .then(data => {
                const labels = Object.keys(data.rates);
                const values = labels.map(date => data.rates[date][target]);
                renderChart(labels.map(d => d.split('-')[2]), values, target);
            })
            .catch(() => {
                console.warn('Historical API failed, showing trend placeholder.');
                const days = Array.from({length: now.getDate()}, (_, i) => i + 1);
                const baseVal = allRates[target] || 1.0;
                const mockValues = days.map(() => baseVal + (Math.random() - 0.5) * (baseVal * 0.02));
                renderChart(days, mockValues, target);
            });
    }

    function renderChart(labels, values, targetSymbol) {
        if (!ctx) return;
        
        const existingChart = Chart.getChart("growthChart");
        if (existingChart) existingChart.destroy();

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const color = isDark ? '#ffd700' : '#2563eb';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: targetSymbol,
                    data: values,
                    borderColor: color,
                    backgroundColor: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: textColor,
                        bodyColor: color,
                        bodyFont: { weight: 'bold', size: 14 },
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `Day ${items[0].label}`,
                            label: (item) => `${item.formattedValue} ${targetSymbol}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: textColor, maxRotation: 0, font: { size: 10 } } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } }
                },
                onHover: (event, chartElement) => {
                    if (chartElement.length > 0) {
                        const index = chartElement[0].index;
                        const value = values[index];
                        mainRateEl.textContent = value.toFixed(4);
                        statusEl.textContent = `Selected: Day ${labels[index]}`;
                    }
                }
            }
        });
    }

    fetchCurrentRates();
    initChart();
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initWeather();
    initForex();
});