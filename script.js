const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BANNER_BASE_URL = "https://image.tmdb.org/t/p/original";

const endpoints = {
    trending: `${BASE_URL}/trending/all/week?api_key=${API_KEY}`,
    topMoviesToday: `${BASE_URL}/movie/popular?api_key=${API_KEY}&region=US`,
    bollywood: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=hi`,
    madeInIndia: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=hi&sort_by=popularity.desc&page=2`,
    kdramas: `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko`,
    continueWatching: `${BASE_URL}/trending/all/day?api_key=${API_KEY}`,
    search: `${BASE_URL}/search/movie?api_key=${API_KEY}&query=`
};

const genreMap = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
    10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
    878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

window.addEventListener("scroll", () => {
    const nav = document.getElementById("top-header");
    if (window.scrollY > 50) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
});

function updateBanner(movie) {
    const banner = document.getElementById("banner");
    const title = document.getElementById("banner__title");
    const genresLabel = document.getElementById("banner__genres");

    const imgPath = movie.backdrop_path || movie.poster_path;
    banner.style.background = `url("${BANNER_BASE_URL}${imgPath}")`;
    banner.style.backgroundSize = "cover";
    banner.style.backgroundPosition = "center 20%";

    title.innerText = movie.title || movie.name || movie.original_name;
    const genres = (movie.genre_ids || []).map(id => genreMap[id]).filter(Boolean).slice(0, 3).join(" • ");
    genresLabel.innerHTML = genres || "New Release &bull; Blockbuster";
}

async function fetchBannerMovie() {
    try {
        const response = await fetch(endpoints.trending);
        const data = await response.json();
        const movies = data.results.filter(m => m.poster_path);
        const movie = movies[Math.floor(Math.random() * movies.length)];
        updateBanner(movie);
    } catch (error) { console.error(error); }
}

function setupSearch() {
    const searchInput = document.getElementById("search-input");
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (query.length > 0) {
                try {
                    const response = await fetch(`${endpoints.search}${encodeURIComponent(query)}`);
                    const data = await response.json();
                    if (data.results && data.results.length > 0) updateBanner(data.results[0]);
                } catch (err) { console.error(err); }
            } else fetchBannerMovie();
        }, 600);
    });
}

// Redesigned Advanced Modal!
async function openModal(movie, mediaType = 'movie') {
    const modal = document.getElementById("movie-modal");

    // Header Image
    const headerImg = document.getElementById("modal-header-image");
    const imgPath = movie.backdrop_path || movie.poster_path;
    headerImg.style.backgroundImage = `url("${BANNER_BASE_URL}${imgPath}")`;

    // Info fields
    document.getElementById("modal-title").innerText = movie.title || movie.name || movie.original_name;

    let matchPct = movie.vote_average ? Math.floor(movie.vote_average * 10) : 85;
    document.getElementById("modal-match").innerText = `${matchPct}% match`;

    let releaseDate = movie.release_date || movie.first_air_date || "2025";
    document.getElementById("modal-year").innerText = releaseDate.substring(0, 4);

    // Generate random duration for flair
    let hrs = Math.floor(Math.random() * 2) + 1;
    let mins = Math.floor(Math.random() * 59) + 1;
    document.getElementById("modal-duration").innerText = mediaType === 'tv' ? `${hrs} Seasons` : `${hrs}h ${mins}m`;

    document.getElementById("modal-description").innerText = movie.overview || "No description available.";

    // Load Cast using Credits API
    const castLabel = document.getElementById("modal-cast-names");
    castLabel.innerText = "Loading...";
    try {
        // If we don't strictly know type, guess based on title vs name property
        let type = movie.title ? "movie" : "tv";
        const creditsResp = await fetch(`${BASE_URL}/${type}/${movie.id}/credits?api_key=${API_KEY}`);
        const creditsData = await creditsResp.json();

        let castNames = creditsData.cast.slice(0, 4).map(c => c.name).join(", ");
        castLabel.innerText = castNames || "Not available";
    } catch (err) {
        castLabel.innerText = "Not available";
    }

    // Load Similar Movies
    const similarGrid = document.getElementById("modal-similar-grid");
    similarGrid.innerHTML = ""; // clear old
    try {
        let type = movie.title ? "movie" : "tv";
        const simResp = await fetch(`${BASE_URL}/${type}/${movie.id}/similar?api_key=${API_KEY}`);
        const simData = await simResp.json();

        // Take just first 9
        const similarList = simData.results.slice(0, 9);
        similarList.forEach(sim => {
            if (sim.poster_path) {
                const wrap = document.createElement("div");
                wrap.className = "similar-wrapper";
                wrap.innerHTML = `
                    <img src="${IMAGE_BASE_URL}${sim.poster_path}" alt="">
                    <div class="similar-recent">Recently added</div>
                `;
                // recursive modal
                wrap.onclick = () => openModal(sim, type);
                similarGrid.appendChild(wrap);
            }
        });
    } catch (err) {
        console.error("Failed similar");
    }

    modal.style.display = "block";
    document.body.style.overflow = "hidden"; // freeze background
}

function setupModal() {
    const modal = document.getElementById("movie-modal");
    document.getElementById("modal-close").onclick = () => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

async function fetchMovies(url, elementId, isLandscape = false) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        const row = document.getElementById(elementId);

        data.results.forEach((movie) => {
            const imagePath = isLandscape ? movie.backdrop_path : movie.poster_path;

            if (imagePath) {
                const wrapper = document.createElement("div");
                wrapper.className = "movie-wrapper";

                const img = document.createElement("img");
                img.className = "row__poster";
                img.src = `${IMAGE_BASE_URL}${imagePath}`;
                wrapper.appendChild(img);

                if (isLandscape) {
                    const playHover = document.createElement("div");
                    playHover.className = "overlay-play";
                    playHover.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
                    wrapper.appendChild(playHover);
                } else {
                    const redBadge = document.createElement("div");
                    redBadge.className = "recently-added";
                    redBadge.innerText = "Recently added";
                    wrapper.appendChild(redBadge);
                }

                wrapper.addEventListener('click', () => openModal(movie));
                row.appendChild(wrapper);
            }
        });
    } catch (error) {
        console.error(`Failed to fetch ${elementId}:`, error);
    }
}

async function fetchTop10() {
    try {
        const response = await fetch(endpoints.topMoviesToday);
        const data = await response.json();
        const row = document.getElementById("top10");
        let counter = 1;
        for (let i = 0; i < data.results.length && counter <= 10; i++) {
            const movie = data.results[i];
            if (movie.poster_path) {
                const itemWrapper = document.createElement("div");
                itemWrapper.className = "top10-item";

                const numberText = document.createElement("span");
                numberText.className = "top10-number";
                numberText.innerText = counter;

                const movieWrapper = document.createElement("div");
                movieWrapper.className = "movie-wrapper";
                const img = document.createElement("img");
                img.className = "row__poster";
                img.src = `${IMAGE_BASE_URL}${movie.poster_path}`;
                const redBadge = document.createElement("div");
                redBadge.className = "recently-added";
                redBadge.innerText = "Recently added";

                movieWrapper.appendChild(img);
                movieWrapper.appendChild(redBadge);
                movieWrapper.addEventListener('click', () => openModal(movie));

                itemWrapper.appendChild(numberText);
                itemWrapper.appendChild(movieWrapper);
                row.appendChild(itemWrapper);
                counter++;
            }
        }
    } catch (error) { }
}

function init() {
    setupModal();
    setupSearch();
    fetchBannerMovie();
    fetchTop10();
    fetchMovies(endpoints.bollywood, "bollywood", false);
    fetchMovies(endpoints.madeInIndia, "made-in-india", false);
    fetchMovies(endpoints.kdramas, "kdramas", false);
    fetchMovies(endpoints.continueWatching, "continue-watching", true);
    fetchMovies(endpoints.trending, "trending", false);
}

document.addEventListener('DOMContentLoaded', init);
