(function(){
    'use strict';

    /**
     * Helper to handler the routes, using ui-route or ngRoute
     */
    angular.module('ARoutePermission').factory('$arp_utils',

    /** @ngInject */
    function ($injector, $location, $browser){
        var $route = $injector.has('$route') ? $injector.get('$route') : null;
        var $state = $injector.has('$state') ? $injector.get('$state') : null;

        function wrapperRoute(route, url){
            return {
                permissions: route.permissions,
                __url:url
            };
        }

        var base = $browser.baseHref().replace(/\/$/, '');

        var utils = {
            siteUrl: function(path){
                if(/^https?\:\/\//.test(path)){
                    return path;
                }else{
                    return location.origin+base+path;
                }
            },
            parseURL: function(url){
                var parse = document.createElement('a');
                parse.href = url;
                return parse;
            },
            getRouteByUrl: function (url){
                if(!url) return;

                // Getting the exactly prefix
                var hashPrefix = $location.absUrl().
                                    // Removing the get parameters
                                    replace(/\?(.*)$/,'').
                                    // Removing the domain
                                    replace(location.origin, '').
                                    // Removing the path
                                    replace($location.path(), '');

                var path = url;
                path = path.replace(location.origin, '');
                path = path.replace(hashPrefix, '');
                path = path.replace(/\?(.*)$/, '');

                // If is another domain, return null
                if(/^https?/.test(path)) return null;

                // Check ui.routes
                if($state){
                    var $urlMatcherFactory = $injector.get('$urlMatcherFactory');
                    var routes = $state.get();
                    for(var i in routes){
                        var what = $urlMatcherFactory.compile(routes[i].url);
                        if(what.regexp && path.match(what.regexp)){
                            return wrapperRoute(routes[i], url);
                        }
                    }
                }

                // Check in ngRoute
                if($route){
                    for(var i in $route.routes){
                        if($route.routes[i].regexp && path.match($route.routes[i].regexp)){
                            return wrapperRoute($route.routes[i], url);
                        }
                    }
                }
            },
            location: {
                _normalize: function(url){
                    if(url.indexOf(location.origin+base) == 0){
                        return url.substr((location.origin+base).length);
                    }
                    return url;
                },
                replace: function(url){
                    url = this._normalize(url);

                    // Verify if is a redirect inside the angular
                    if(!/https\:\/\/?/.test(url) && typeof utils.getRouteByUrl(url) == 'object'){
                      $location.replace().url(url);
                    }else{
                      window.location.replace(utils.siteUrl(url));
                    }
                },
                path: function(path){
                    path = this._normalize(path);

                    // Verify if is a redirect inside the angular
                    if(!/https\:\/\/?/.test(url) && typeof this.getRouteByUrl(path) == 'object'){
                        $location.path(path);
                    }else{
                        window.location = utils.siteUrl(path);
                    }
                },
            }
        }


        return utils;
    });

    /**
     * IE location.origin fix
     */
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
    }
})();
