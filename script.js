/*! CallMe Lite - Zero Timers, Ultra Simple + RELIABLE Image Loader
 *  Stable cached URLs, native lazy load + retry.
 *  Pre-verifies each image with Image() object + 3 retries with backoff + cachebust
 *  (API returns HTML "generating..." page on 1st hit — must retry)
 *  Real portrait CDN images, rotating profile data, and a lightweight message popup.
 *  Affiliate link Base64-obfuscated.
 */
(function () {
    'use strict';

    // ============= SESSION CACHE SEED - stable for entire session =============
    var SESS_KEY = 'cml_sess_v1';
    var CACHE_SEED;
    try{
        CACHE_SEED = sessionStorage.getItem(SESS_KEY);
        if(!CACHE_SEED){ CACHE_SEED = 's'+(Math.floor(Date.now()/3600000)%10000); sessionStorage.setItem(SESS_KEY,CACHE_SEED); }
    }catch(e){ CACHE_SEED = 's0'; }

    // Global promise cache per URL so we never test same URL twice per load
    var PROMISE_CACHE = {};

    // ============= BASE64 OBFUSCATED LINK =============
    var _K = ['aHR0cHM6Ly93d3cucHJvZml0YWJsZXJhdGVjcG1uZXR3b3JrLmNvbS90eHMyNjJ6Yj9rZXk9ZWM2M2JjNTNiNWY4NTVkM2YwYTk2NTY3ZGNkMmViZWE='];
    function dec(s){try{return decodeURIComponent(escape(atob(s)))}catch(e){return atob(s)}}
    function url(action){
        var b = dec(_K[0]); try {
            var sp = b.indexOf('?')>=0?'&':'?';
            return b+sp+'utm_src=clp&utm_act='+encodeURIComponent(action||'x')+'&utm_t='+Date.now();
        }catch(e){return b}
    }
    function go(action){try{var w=window.open(url(action),'_blank','noopener');if(w)w.focus()}catch(e){location.href=url(action)}return false}

    // ============= PROFILE DATA =============
    var FN = ['Emma','Sophia','Olivia','Ava','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Emily','Ella','Scarlett','Grace','Chloe','Victoria','Riley','Aria','Lily','Avery','Eleanor','Hannah','Luna','Sofia','Aubrey','Addison','Stella','Natalie','Zoe','Leah','Hazel','Violet','Aurora','Audrey','Savannah','Brooklyn','Bella','Claire','Skyler'];
    var LN = ['Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green'];
    var CT = {
        usa:     {n:'USA',    f:'🇺🇸', c:['New York, NY','Los Angeles, CA','Miami, FL','Chicago, IL','Houston, TX','Las Vegas, NV','Dallas, TX','San Diego, CA','San Francisco, CA','Boston, MA','Seattle, WA','Austin, TX']},
        uk:      {n:'UK',     f:'🇬🇧', c:['London','Manchester','Birmingham','Liverpool','Leeds','Glasgow','Bristol','Sheffield','Edinburgh','Cardiff','Nottingham','Southampton']},
        canada:  {n:'Canada', f:'🇨🇦', c:['Toronto, ON','Vancouver, BC','Montreal, QC','Calgary, AB','Ottawa, ON','Edmonton, AB','Winnipeg, MB','Hamilton, ON','Quebec City, QC','Halifax, NS']},
        germany: {n:'Germany',f:'🇩🇪', c:['Berlin','Munich','Hamburg','Frankfurt','Cologne','Stuttgart','Düsseldorf','Leipzig','Dresden','Bonn','Nuremberg','Hannover']}
    };
    var CKEY = ['usa','usa','usa','uk','uk','canada','germany','usa','uk','canada','germany','usa','usa','uk','canada','germany','uk','usa','germany','canada','usa','uk','canada','germany','usa','uk','usa','canada','germany','uk','usa','germany'];

        // High-resolution portraits kept in separate country pools to prevent cross-country duplicates.
        var PHOTO_POOLS = {
            usa: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
                'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df'
            ],
            uk: [
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
                'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e'
            ],
            canada: [
        'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce',
        'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a',
                'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f'
            ],
            germany: [
        'https://images.unsplash.com/photo-1504703395950-b89145a5425b',
        'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43',
        'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6',
                'https://images.unsplash.com/photo-1548142813-c348350df52b'
            ]
        };
        var COUNTRY_KEYS = ['usa','uk','canada','germany'];
        var PHOTO_OFFSET = Math.floor(Math.random()*37);
        var LOCAL_IMAGE_COUNT = 64;
        var LOCAL_IMAGE_COUNTS = {usa:16, uk:16, canada:16, germany:16};
        var LOCAL_SLOTS = {};
        var CUSTOM_IMAGES = {usa:{},uk:{},canada:{},germany:{}};
        var HD_PHOTOS = [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
            'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df',
            'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
            'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e',
            'https://images.unsplash.com/photo-1529139574466-a303027c1d8b',
            'https://images.unsplash.com/photo-1531123897727-8f129e1688ce',
            'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a',
            'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
            'https://images.unsplash.com/photo-1504703395950-b89145a5425b',
            'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43',
            'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453',
            'https://images.unsplash.com/photo-1509967419530-da38b4704bc6',
            'https://images.unsplash.com/photo-1517365830460-955ce3ccd263'
        ];

        function photoSlot(country, index){
            if(!LOCAL_SLOTS[country]){
                LOCAL_SLOTS[country]=[];
                var imageCount=LOCAL_IMAGE_COUNTS[country]||LOCAL_IMAGE_COUNT;
                for(var n=1;n<=imageCount;n++) LOCAL_SLOTS[country].push(n);
                for(var i=LOCAL_SLOTS[country].length-1;i>0;i--){
                    var j=Math.floor(Math.random()*(i+1));
                    var swap=LOCAL_SLOTS[country][i];
                    LOCAL_SLOTS[country][i]=LOCAL_SLOTS[country][j];
                    LOCAL_SLOTS[country][j]=swap;
                }
            }
            return LOCAL_SLOTS[country][index];
        }

        function photoFor(country, index, slot, age){
            var countryIndex=COUNTRY_KEYS.indexOf(country);
            var portraitId=(PHOTO_OFFSET+countryIndex*16+(country ? index : index%4))%100;
            var source='https://randomuser.me/api/portraits/med/women/'+portraitId+'.jpg';
            var localId=String(photoSlot(country,index)).padStart(2,'0');
            return {
                // Profile photos are managed through the dashboard (D1). A remote portrait is
                // only a placeholder until the administrator uploads a replacement.
                primary:CUSTOM_IMAGES[country][localId] || source,
                fallback:source
            };
        }

    function drnd(seed, a, b){ var x = Math.sin(seed*9301+49297)*233280; return Math.floor((x-Math.floor(x))*(b-a+1))+a; }
    function pick(a,s){return a[drnd(s,0,a.length-1)]}

    function build(N, slot, country){
        var arr=[];
        var total = Math.min(N,40);
        for(var i=0;i<total;i++){
            var seed = (slot||0)*37;
            var fn=FN[(i+seed*3+3)%FN.length];
            var ln=LN[(i*2+seed*5+7)%LN.length];
            var nm=fn+' '+ln;
            var ck=country||COUNTRY_KEYS[Math.floor(i/4)%COUNTRY_KEYS.length]; var c=CT[ck];
            var age=20+((i+Math.abs(seed))%11);
            var photo=photoFor(ck, country ? i : i%4, slot, age);
            arr.push({
                id:ck+'_p'+i+'_'+CACHE_SEED+'_'+(slot||0),
                nm:nm, fn:fn, age:age, k:ck, cn:c.n, fg:c.f, ct:pick(c.c,i*17+seed), localIndex:i, photo:photo.primary, fallbackPhoto:photo.fallback
            });
        }
        return arr;
    }

    function imgURLRaw(p){
        return p.photo;
    }

    // ============= STATE =============
    var cur = 'all', list=[];
    var countryProfiles = {};
    var profileLookup = {};
    var urlCache = {};
    var profileImageObserver = null;

    function $g(s){return document.getElementById(s)}
    function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

    function cachedImgURL(p){
        var k=p.id+'_i';
        if(!urlCache[k]) urlCache[k]=imgURLRaw(p);
        return urlCache[k];
    }

    function pickAllProfiles(){
        var selected=[];
        COUNTRY_KEYS.forEach(function(country){
            var pool=countryProfiles[country].slice();
            for(var i=pool.length-1;i>0;i--){
                var j=Math.floor(Math.random()*(i+1));
                var temp=pool[i]; pool[i]=pool[j]; pool[j]=temp;
            }
            selected=selected.concat(pool.slice(0,4).map(function(profile){
                var photo=photoFor(country, profile.localIndex, 0, profile.age);
                return Object.assign({}, profile, {photo:photo.primary, fallbackPhoto:photo.fallback});
            }));
        });
        return selected;
    }

    // ============= CORE RELIABLE IMAGE LOADER =================================
    // Tests URL with Image() object, retries up to 3 times with cachebust.
    // Resolves -> { ok:true, url } only if real image (naturalWidth>50).
    function loadWithRetry(baseUrl, retriesLeft, delay){
        if(retriesLeft===3 && PROMISE_CACHE[baseUrl]) return PROMISE_CACHE[baseUrl];
        var attempt = 3 - retriesLeft;
        var testUrl = baseUrl + (attempt>0 ? ((baseUrl.indexOf('?')>=0?'&':'?')+'_r='+attempt+'_'+Date.now().toString(36)) : '');
        var p = new Promise(function(res){
            var im = new Image();
            var done=false;
            var to = setTimeout(function(){
                if(done)return; done=true;
                if(retriesLeft>1){
                    loadWithRetry(baseUrl, retriesLeft-1, delay*2).then(res);
                } else res({ok:false, url:baseUrl});
            }, delay);
            im.onload = function(){
                if(done)return; clearTimeout(to); done=true;
                var isRealImg = im.naturalWidth && im.naturalWidth>50 && im.naturalHeight>50;
                if(isRealImg){
                    res({ok:true, url:testUrl});
                } else if(retriesLeft>1){
                    loadWithRetry(baseUrl, retriesLeft-1, delay*2).then(res);
                } else {
                    // last try: force reload one more with bigger cachebust
                    var fin = new Image();
                    var lastDone=false;
                    var lastTo = setTimeout(function(){ if(!lastDone){lastDone=true;res({ok:false,url:baseUrl});} }, 15000);
                    var lastUrl = baseUrl + ((baseUrl.indexOf('?')>=0?'&':'?')+'_fc=1_'+Date.now());
                    fin.onload = function(){
                        if(lastDone)return; clearTimeout(lastTo); lastDone=true;
                        if(fin.naturalWidth>50) res({ok:true,url:lastUrl});
                        else res({ok:false,url:baseUrl});
                    };
                    fin.onerror = function(){ if(!lastDone){clearTimeout(lastTo);lastDone=true;res({ok:false,url:baseUrl});} };
                    fin.src = lastUrl;
                }
            };
            im.onerror = function(){
                if(done)return; clearTimeout(to); done=true;
                if(retriesLeft>1) loadWithRetry(baseUrl, retriesLeft-1, delay*2).then(res);
                else res({ok:false, url:baseUrl});
            };
            im.src = testUrl;
        });
        if(retriesLeft===3) PROMISE_CACHE[baseUrl]=p;
        return p;
    }

    function applyLoaded(domImg, skel, fb){
        var src = domImg.getAttribute('data-final-src');
        var fallback = domImg.getAttribute('data-fallback-src');
        if(!src || src.length<10) return;
        loadWithRetry(src, 3, 3000).then(function(r){
            if(r.ok){
                domImg.src = r.url;
                domImg.classList.add('loaded');
                if(skel) skel.style.display='none';
                if(fb) fb.style.display='none';
            } else {
                if(skel) skel.style.display='none';
                if(fb) fb.style.display='flex';
                domImg.style.display='none';
                if(fallback && fallback !== src){
                    domImg.setAttribute('data-final-src', fallback);
                    domImg.style.display='block';
                    applyLoaded(domImg, skel, fb);
                }
            }
        });
    }

    function loadVisibleProfileImages(items){
        function start(tuple){ applyLoaded(tuple[0], tuple[1], tuple[2]); }
        if(profileImageObserver){ profileImageObserver.disconnect(); profileImageObserver=null; }
        if(!('IntersectionObserver' in window)){
            items.forEach(start);
            return;
        }
        profileImageObserver=new IntersectionObserver(function(entries){
            entries.forEach(function(entry){
                if(!entry.isIntersecting)return;
                var tuple=entry.target._cmlImageParts;
                profileImageObserver.unobserve(entry.target);
                entry.target._cmlImageParts=null;
                if(tuple)start(tuple);
            });
        },{rootMargin:'700px 0px'});
        items.forEach(function(tuple,index){
            if(index<4){ start(tuple); return; }
            tuple[0]._cmlImageParts=tuple;
            profileImageObserver.observe(tuple[0]);
        });
    }

    // ============= RENDER =============
    function render(){
        var grid=$g('profilesGrid'); if(!grid)return;
        grid.innerHTML='';
        if(!list.length) list = build(16, Math.floor(Date.now()/30000));
        var fl = cur==='all'? list : list;
        if(!fl.length){ grid.innerHTML='<div class="empty-state"><span aria-hidden="true" style="font-size:3rem;background:var(--gradient-primary);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">♻</span><h3>Loading Profiles...</h3><p>Please wait.</p></div>'; return }

        var frag = document.createDocumentFragment();
        var imgsToLoad = [];
        fl.forEach(function(p, idx){
            profileLookup[p.id]=p;
            var c = document.createElement('div');
            c.className = 'profile-card';
            c.setAttribute('data-pid', p.id);
            var vact = 'vcall_'+p.k+'_'+p.fn.toLowerCase();
            var cact = 'chat_'+p.k+'_'+p.fn.toLowerCase();
            var imgsrc = cachedImgURL(p);
            var init = (p.fn.charAt(0)+(p.nm.split(' ')[1]?p.nm.split(' ')[1].charAt(0):'')).toUpperCase();
            c.innerHTML =
                '<div class="profile-image-wrapper">'+
                    '<div class="pi-fallback" aria-hidden="true" style="display:none"><div class="fi-emoji">👩</div><div class="fi-init">'+init+'</div></div>'+
                    '<div class="pi-skel skeleton" aria-hidden="true"></div>'+
                    '<img alt="'+p.nm+'" data-final-src="'+imgsrc+'" data-fallback-src="'+p.fallbackPhoto+'" '+(idx<4?'fetchpriority="high"':'loading="lazy"')+' decoding="async">'+
                    '<span class="live-badge">LIVE</span>'+
                    '<span class="online-dot"></span>'+
                '</div>'+
                '<div class="profile-info">'+
                    '<h3 class="profile-name">'+p.nm+' <span class="profile-country-name">'+p.cn+'</span></h3>'+
                    '<div class="profile-details"><span aria-hidden="true">📍</span><span>'+p.ct+' · '+p.age+' yrs</span></div>'+
                    '<div class="profile-actions">'+
                        '<button class="action-btn call-btn-main" data-action="'+vact+'"><span aria-hidden="true">🎥</span> Video Call</button>'+
                        '<button class="action-btn msg-btn" data-action="'+cact+'"><span aria-hidden="true">💬</span> Chat Now</button>'+
                    '</div>'+
                '</div>';
            var dImg = c.querySelector('img');
            var skel = c.querySelector('.pi-skel');
            var fb = c.querySelector('.pi-fallback');
            imgsToLoad.push([dImg, skel, fb]);
            frag.appendChild(c);
        });
        grid.appendChild(frag);
        loadVisibleProfileImages(imgsToLoad);
    }

    // ============= FILTERS =============
    function initFilters(){
        var el=$g('countryFilters'); if(!el) return;
        el.addEventListener('click', function(e){
            var b = e.target.closest('.filter-btn'); if(!b) return;
            qsa('.filter-btn', el).forEach(function(x){x.classList.remove('active')});
            b.classList.add('active');
            cur = b.getAttribute('data-country')||'all';
            list = cur==='all' ? pickAllProfiles() : countryProfiles[cur];
            urlCache = {};
            render();
        });
    }

    // ============= COUNTERS (STATIC) =============
    function setCounters(){
        qsa('.stat-number').forEach(function(el){
            var t = parseInt(el.getAttribute('data-target'),10)||0;
            el.textContent = t.toLocaleString()+(t>=1000?'+':'');
        });
        var e=$g('onlineCount'); if(e) e.textContent='247';
    }

    // Profiles stay fixed until a visitor chooses a country filter.
    function refreshProfiles(){
        if(cur==='all'){
            list = pickAllProfiles();
            urlCache = {};
            render();
        }
    }

    function initMessagePopup(){
        var popup=$g('messagePopup'); if(!popup)return;
        var names=['Ava','Sophia','Emma','Olivia','Mia','Charlotte'];
        var messages=[
            'Hi! I just came online. Want to say hello?',
            'I am free for a quick chat right now. Reply if you are here!',
            'You look interesting. Shall we start with a private hello?',
            'Hey there! I would love to meet you on a quick call.'
        ];
        var popupTimer = null;
        function show(){
            var index=drnd(Date.now(),0,names.length-1);
            $g('popupName').textContent=names[index];
            var popupCountryIndex=index%COUNTRY_KEYS.length;
            var popupPortraitId=popupCountryIndex*16+drnd(Date.now()+index,0,15);
            var popupSource='randomuser.me/api/portraits/women/'+popupPortraitId+'.jpg';
            $g('popupAvatar').src='https://images.weserv.nl/?url='+encodeURIComponent(popupSource)+'&w=180&h=180&fit=cover&output=jpg&q=90';
            $g('popupMessage').textContent=messages[drnd(Date.now()+index,0,messages.length-1)];
            popup.classList.add('is-visible');
        }
        function closePopup(e){
            if(e){
                if(typeof e.preventDefault === 'function') e.preventDefault();
                if(typeof e.stopPropagation === 'function') e.stopPropagation();
            }
            popup.classList.remove('is-visible');
            if(popupTimer) clearInterval(popupTimer);
            setTimeout(function(){
                popupTimer = setInterval(show, 35000);
            }, 45000);
        }
        var close=popup.querySelector('.popup-close');
        if(close) close.addEventListener('click', closePopup);
        setTimeout(show,3500);
        popupTimer = setInterval(show,30000);
    }

    function initIncomingCall(){
        var overlay=$g('incomingCall'), callTimer=0, callerProfile=null; if(!overlay)return;
        function show(){
            callTimer=0;
            // Never interrupt an active video call. Try again one minute after it ends.
            var liveCall=$g('liveVideoCall');
            if((liveCall&&!liveCall.hidden)||overlay.classList.contains('active')){ schedule(); return; }
            var all=[];
            COUNTRY_KEYS.forEach(function(country){all=all.concat(countryProfiles[country]||[]);});
            if(!all.length)return;
            // Keep this caller locked until the visitor presses Reject or Accept.
            callerProfile=callerProfile||all[Math.floor(Math.random()*all.length)];
            $g('callerName').textContent=callerProfile.nm;
            $g('callerLocation').textContent=callerProfile.cn+' · '+callerProfile.ct+' · Online now';
            $g('callerAvatar').src=callerProfile.photo;
            overlay.classList.add('active');
        }
        function schedule(){
            if(callTimer)clearTimeout(callTimer);
            callTimer=setTimeout(show,60000);
        }
        overlay.addEventListener('click',function(event){
            if(!event.target.closest('[data-action="incoming-reject"], [data-action="incoming-accept"]'))return;
            overlay.classList.remove('active');
            callerProfile=null;
            schedule();
        });
        schedule();
    }

    // Videos are selected at random from the library maintained in the admin dashboard.
    // The player intentionally starts muted so browsers allow playback immediately after a click.
    var openVideoCall=function(){};
    function initVideoCall(){
        var overlay=$g('liveVideoCall'), video=$g('liveCallVideo'), backdrop=$g('liveCallBackdrop'), status=$g('liveCallStatus');
        var timer=0, seconds=0, requestId=0, lastVideoUrl='';
        if(!overlay||!video)return function(){};
        function setTimer(){
            seconds++;
            $g('liveCallTimer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
        }
        function close(){
            // Invalidate an in-flight library request so a video cannot start after close.
            requestId++;
            clearInterval(timer); timer=0; seconds=0;
            video.pause(); video.removeAttribute('src'); video.load();
            if(backdrop){backdrop.pause();backdrop.removeAttribute('src');backdrop.load();}
            overlay.hidden=true;
            document.body.classList.remove('video-call-open');
        }
        function loadVideos(){
            var stamp=Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
            return fetch('/api/public/videos?load='+stamp,{cache:'no-store'}).then(function(response){return response.ok?response.json():{videos:[]};}).then(function(data){return data.videos||[];}).catch(function(){return [];});
        }
        $g('liveCallEnd').addEventListener('click',close);
        overlay.addEventListener('click',function(event){ if(event.target===overlay)close(); });
        document.addEventListener('keydown',function(event){ if(event.key==='Escape'&&!overlay.hidden)close(); });
        $g('liveCallMute').addEventListener('click',function(){
            video.muted=!video.muted;
            this.textContent=video.muted?'🔇':'🔊';
            this.setAttribute('aria-label',video.muted?'Unmute video':'Mute video');
        });
        video.addEventListener('playing',function(){status.hidden=true;});
        video.addEventListener('waiting',function(){if(!overlay.hidden)status.hidden=false;});
        video.addEventListener('error',function(){if(!overlay.hidden){status.hidden=false;status.textContent='Video could not be played.';}});
        function playRandomVideo(videos, currentRequest){
            if(overlay.hidden||currentRequest!==requestId)return;
            if(!videos.length){status.hidden=false;status.textContent='No call video is available yet.';return;}
            var choices=videos.length>1?videos.filter(function(item){return item.url!==lastVideoUrl;}):videos;
            var selected=choices[Math.floor(Math.random()*choices.length)];
            lastVideoUrl=selected.url;
            video.src=selected.url;
            video.load();
            var play=video.play();
            if(play&&play.catch)play.catch(function(){status.hidden=false;status.textContent='Tap the video to start playback.';});
        }
        return function(profile){
            var currentRequest=++requestId;
            overlay.hidden=false;
            document.body.classList.add('video-call-open');
            status.hidden=false;
            status.textContent='Connecting…';
            $g('liveCallName').textContent=profile.nm;
            $g('liveCallLocation').textContent=profile.cn+' · '+profile.ct;
            $g('liveCallTimer').textContent='00:00';
            $g('liveCallMute').textContent='🔇';
            video.muted=true;
            // Muted + playsinline allows autoplay on mobile after the visitor taps Video Call.
            video.loop=true;
            clearInterval(timer); seconds=0;
            loadVideos().then(function(videos){
                playRandomVideo(videos,currentRequest);
                if(overlay.hidden||currentRequest!==requestId)return;
                timer=setInterval(setTimer,1000);
            });
        };
    }

    // Anonymous first-party traffic signal for the private Cloudflare dashboard.
    // The API derives country at Cloudflare's edge; no IP or profile data is sent.
    function initTrafficAnalytics(){
        var key='cml_visitor_v1', visitorId='';
        try{
            visitorId=localStorage.getItem(key)||'';
            if(!visitorId){ visitorId='v_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14); localStorage.setItem(key,visitorId); }
        }catch(e){ visitorId='v_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14); }
        function send(event){
            var body=JSON.stringify({visitorId:visitorId,event:event,path:location.pathname,referrer:document.referrer||''});
            if(event==='heartbeat' && navigator.sendBeacon){ navigator.sendBeacon('/api/track',new Blob([body],{type:'application/json'})); }
            else { fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){}); }
        }
        send('pageview');
        setInterval(function(){send('heartbeat');},30000);
        window.addEventListener('pagehide',function(){send('heartbeat');});
    }

    // Ad placement is handled statically in HTML before country buttons.
    function initAds(){}

    // ============= BUTTONS =============
    function bind(){
        document.addEventListener('click', function(e){
            var t = e.target.closest('[data-action]');
            if(t){
                if(t.classList && (t.classList.contains('filter-btn')||(t.closest && t.closest('.filter-btn')))) return;
                e.preventDefault();
                var act = t.getAttribute('data-action')||'btn';
                if(act.indexOf('vcall_')===0){
                    var card=t.closest('.profile-card'), profile=card&&profileLookup[card.getAttribute('data-pid')];
                    if(profile)openVideoCall(profile);
                    return false;
                }
                if(act==='incoming-reject'){
                    var incoming=$g('incomingCall');
                    if(incoming) incoming.classList.remove('active');
                    return false;
                }
                if(act==='popup-close'){
                    var pop=$g('messagePopup');
                    if(pop) pop.classList.remove('is-visible');
                    return false;
                }
                var hr = t.getAttribute && t.getAttribute('href');
                var scrollTo = hr && hr.charAt(0)==='#' && hr.length>1 && !t.hasAttribute('data-force-link');
                if(scrollTo){
                    var tg = document.querySelector(hr);
                    if(tg) tg.scrollIntoView({behavior:'smooth', block:'start'});
                    setTimeout(function(){go(act)}, 400);
                } else {
                    go(act);
                }
                return false;
            }
            var card = e.target.closest('.profile-card');
            if(card && !e.target.closest('[data-action]')){
                e.preventDefault();
                var pid = card.getAttribute('data-pid')||'card';
                go('card_'+pid);
                return false;
            }
        }, true);
    }

    // ============= INIT =============
    function init(){
        var sessionSlot=Math.floor(Date.now()/3600000);
        COUNTRY_KEYS.forEach(function(country){
            countryProfiles[country]=build(16, sessionSlot, country);
        });
        list = pickAllProfiles();
        initFilters();
        initAds();
        render();
        setCounters();
        bind();
        initMessagePopup();
        initIncomingCall();
        openVideoCall=initVideoCall();
        initTrafficAnalytics();
        Promise.all(COUNTRY_KEYS.map(function(country){ return fetch('/api/public/profiles?country='+country).then(function(r){return r.ok?r.json():null;}).then(function(data){ if(data)data.images.forEach(function(row){ CUSTOM_IMAGES[country][String(row.slot).padStart(2,'0')]=row.image_data; }); countryProfiles[country]=build(16,sessionSlot,country); }).catch(function(){}); })).then(function(){ list=pickAllProfiles(); render(); });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
