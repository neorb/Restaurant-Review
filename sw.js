var cacheID = "mws-restaurant-stage-1";

importScripts ( '/js/idb.js' );

const database = 'restaurant';
const storeName = 'restaurants';

const dbPromise = idb.open(database, 1, upgradeDb => {
    switch (upgradeDb.oldVersion ){
        case 0:
          return upgradeDb.createObjectStore(storeName, {keyPath: 'id'});
    }
  
});


self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheID).then((cache) => {
            return cache
              .addAll([
                "/",
                "/index.html",
                "/restaurant.html",
                "/css/styles.css",
                "/js/dbhelper.js",
                "/js/main.js",
                "/js/restaurant_info.js",
                "/img/na.gif",
                "/js/register.js",
              ])
              .catch(error => {
                  console.log("Caches open failed: " + error);
              });
    
        })
        
    );
});

self.addEventListener("fetch", event => {
    console.log('service Worker:fetching');
    let cacheRequest =  event.request;
    //let cacheUrlObj = new URL(event.request.url);
    if (event.request.url.indexOf("restaurant.html") > -1) {
        const cacheURL = "restaurant.html";
        cacheRequest = new Request(cacheURL);
        
    }
   
    const checkURL = new URL(event.request.url);
    if (checkURL.port === "1337") {
      const parts = checkURL.pathname.split("/");
      const id =  
        parts[parts.length - 1] === "restaurants"
            ? "-1"
            : parts[parts.length - 1];
     //handleAJAXEvent(event, id);
    } else {
      handleNonAJAXEvent(event, cacheRequest);
    }
});
    
 
fetch("http://localhost:1337/restaurants")
       .catch(e => {
         console.log('Offline mode' + e);
         return;
       })
       .then(response =>{
         if (!response || response.status !== 200) {return}
         return response.json();
       })
       .then(theseRest => {
         if (theseRest) {
         console.log('These restaurants are from the server', theseRest);
         dbPromise.then(db => {
           var tx = db.transaction(storeName, 'readwrite');
           var restStore = tx.objectStore(storeName);
           theseRest.forEach(rest => {
            restStore.put({id: rest.id, data: rest 
             });
           });
         });
         return theseRest;
         } else {
           console.log('No response from the network');
           dbPromise.then(db => {
            var tx = db.transaction(storeName);
            var restStore = tx.objectStore(storeName);
              
            return restStore.getAll();
           });
         }
       }).then(data => {
         console.log('data is', data);
         //callback(null, data);
});
      


const handleAJAXEvent = (event, id) => {
    event.respondWith(
             dbPromise
        .then(db => {
            return db
            .transaction(storeName)
            .objectStore(storeName)
            .get(id);
        })
        .then(data => {
            return (
                (data && data.data) ||
                fetch(event.request)
                .then(fetchResponse => fetchResponse.json())
                .then(json => {
                    return dbPromise.then(function(db) {
                        var tx = db.transaction(storeName, 'readwrite');
                        tx.objectStore(storeName).put({id: id, data: json});
                        return json.getAll(); 
                    });
                })
            );
        })
        .then(finalResponse => {
            return new Response(JSON.stringify(finalResponse));
        })
        .catch(_error => {
            return new Response("Error fetching data", { status: 500});
        })
    );
};

const handleNonAJAXEvent = (event, cacheRequest) => {
  event.respondWith(
    caches.match(cacheRequest).then(response => {
        return (
        response ||
        fetch(event.request)
            .then(fetchResponse => {
                return caches.open(cacheID).then(cache =>{ 
                    cache.put(event.request, fetchResponse.clone());
                    return fetchResponse;
                    });
                })
                .catch(_error => {
                    if (event.request.url.indexOf(".jpg") > -1) {
                        return caches.match("/img/na.gif");
                      }
                       return new Response("Application is not connected to the internet",
                      {
                        status:404,
                        statusText: "Application is not connected to the internet"
                      }
                    );
                })
            );
        })
    );
};