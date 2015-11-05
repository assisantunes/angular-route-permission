(function(){
    'use strict';

    angular.module('ARoutePermission', []).run(

    /** @ngInject */
    ["$rootScope", "$location", "$browser", "ARoutePermission", "ARoutePermissionExceptions", "$arp_permissions", "$arp_utils", function ($rootScope, $location, $browser, ARoutePermission, ARoutePermissionExceptions, $arp_permissions, $arp_utils){

        $rootScope.$on("$locationChangeStart", function(event, newUrl, oldUrl, newState, oldState) {
            if(event.defaultPrevented) return;

            var currentReplace = $location.$$replace;
            var route = $arp_utils.getRouteByUrl(newUrl);

            // Checking if exists some permissions to access this route
            if(route && route.permissions && route.permissions.length > 0){
                console.log('[ARoutePermission]', 'Validating permissions for the route', newUrl);
                // Prevent the locationChange to continue
                event.preventDefault();

                // Run the permissions
                $arp_permissions.run(route.permissions, function(status, exception){
                    if(status){
                        console.log('[ARoutePermission]', 'Permissions validated');

                        $browser.url(newUrl, currentReplace);
                        $rootScope.$evalAsync(function() {
                            $location.$$parse(newUrl);
                            $rootScope.$broadcast('$locationChangeSuccess', newUrl, oldUrl);
                        });
                        if (!$rootScope.$$phase) $rootScope.$digest();

                    }else{
                        if(!exception){
                            exception = ARoutePermissionExceptions.NotAllow();
                        }
                        exception.$$do(route);
                    }
                });
            }
        });

        function onError(event){
            var rejection;
            if(event.name === '$stateChangeError')
                rejection = arguments[5] || null;
            else if(event.name === '$routeChangeError')
                rejection = arguments[3] || null;

            // Listening the ARoutePermission exception
            if(rejection && rejection.$$arp){
                console.log('[ARoutePermission]', 'error exception catched');
                if(typeof event.preventDefault == 'function') event.preventDefault();
                if(typeof event.stopPropagation == 'function') event.stopPropagation();
                rejection.$$do();
            }
        }
        $rootScope.$on('$routeChangeError', onError);
        $rootScope.$on('$stateChangeError', onError);

        function onSuccess(event){
            var url = '';

            // Get the requested URL using ngRoute
            if(event.name == '$routeChangeSuccess'){
                try{ url = arguments[1].$$route.__url; }catch(err){}
            // Get the requested PATH using ui.route
            }else if(event.name == '$stateChangeSuccess'){
                try{ url = arguments[1].url; }catch(err){}
            }

            console.log('[ARoutePermission]', 'route successfully changed', url );
        }
        $rootScope.$on('$stateChangeSuccess', onSuccess);
        $rootScope.$on('$routeChangeSuccess', onSuccess);
    }]);
})();

(function(){
    'use strict';

    angular.module('ARoutePermission').factory('ARoutePermissionExceptions',

    /** @ngInject */
    ["ARoutePermission", "$location", function(ARoutePermission, $location){
        /**
         * Helper to allow use promise.reject in the route resolves dependencies
         *
         * If you need to reject a route.resolve, the $routeChangeError
         * should receive the exception in order to perform the exception action
         */
        var result = function(){
          var _arguments = arguments;
          var _this = this;
          return {
            // Just to the listener of "$routeChangeError" event identify
            // that this is a exception from the ARoutePermission
            $$arp:true,
            // The method to run the exception
            $$do:function(){ _this.$$do.apply(_this, _arguments); },
          }
        }

        /**
         * Default prototype for the exception
         */
        var defaultExceptionPrototype = {
            result:result, $$arp: true
        }


        /**
         * [RedirectException]
         */
        function RedirectException(){
            if(!(this.redirect = arguments[0]))
                throw 'RedirectException require "path" as parameter';

            // Force resolve router after complete;
            if(typeof arguments[1] === 'boolean'){
                this.resolveFinalPath = Boolean(arguments[1] === true);
            }else if(typeof arguments[1] === 'string'){
                this.finalPath = arguments[1];
            }

            // Include the redirect parameter on the url
            if(typeof arguments[2] === 'string'){
                this.redirectParam = arguments[2];
            }
        }
        RedirectException.prototype = angular.extend({}, defaultExceptionPrototype, {
            name:'RedirectException',
            $$do:function(){
                if(this.resolveFinalPath) arguments[0] = $location.absUrl();
                if(this.finalPath) arguments[0] = this.finalPath;

                // Converting route to path
                if(typeof arguments[0] == 'object') arguments[0] = (arguments[0].__url || null);

                console.log('[ARoutePermission]', 'RedirectException [redirect:'+this.redirect+'] intent:', arguments[0] || null);
                ARoutePermission.$$redirectTo(this.redirect, arguments[0] || null, this.redirectParam ? this.redirectParam : null);
            }
        });

        /**
         * [NotAllowException]
         */
        function NotAllowException(){}
        NotAllowException.prototype = angular.extend({}, defaultExceptionPrototype, {
            name:'NotAllowException',
            $$do:function(){
                if(ARoutePermission.$$is_first_route) ARoutePermission.$$redirectTo('/');
            }
        });


        /**
         * Return helpers to instanciate the exceptions
         */
        return {
          Redirect:function(){return __construct(RedirectException, arguments)},
          NotAllow:function(){return __construct(NotAllowException, arguments)},
        };
    }]);


    /**
     * Helper to use of .apply() with 'new' operator
     */
    function __construct(constructor, args) {
        function F() {
            return constructor.apply(this, args);
        }
        F.prototype = constructor.prototype;
        return new F();
    }
})();

(function(){
    'use strict';

    /**
     * Helper to handler the routes, using ui-route or ngRoute
     */
    angular.module('ARoutePermission').factory('$arp_utils',

    /** @ngInject */
    ["$injector", "$location", "$browser", function ($injector, $location, $browser){
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
    }]);

    /**
     * IE location.origin fix
     */
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
    }
})();

(function(){
    'use strict';

    /**
     * Helper to handler the routes, using ui-route or ngRoute
     */
    angular.module('ARoutePermission').factory('$arp_storage',

    /** @ngInject */
    function (){
        function Store(prefix){
            if(!(this instanceof Store)) return new Store(prefix);
            this.prefix = (prefix || 'store');
        }

        Store.prototype.localStoreSupport = function() {
            try {
                return 'localStorage' in window && window['localStorage'] !== null;
            } catch (e) {
                return false;
            }
        }

        Store.prototype.set = function(_name, value, minutes) {
            var name = this.prefix+'_'+_name;

            var expires = null;
            if (minutes) {
                var date = new Date();
                date.setTime(date.getTime()+(minutes*60*1000));
                var expires = date;
            }

            if( this.localStoreSupport() ) {
                localStorage.setItem(name, JSON.stringify({'expires': expires ? expires.getTime() : null, 'value': value}));
            }else {
                var cookie = name+"="+JSON.stringify(value)+"; ";
                if(expires) cookie += "expires="+expires.toGMTString()+"; ";
                document.cookie = cookie+"path=/; ";
            }
        }

        Store.prototype.get = function(_name) {
            var name = this.prefix+'_'+_name;

            if( this.localStoreSupport() ) {
                var raw = localStorage.getItem(name);
                if(!raw) return null;

                var data = JSON.parse(raw);

                if (data.expires && new Date().getTime() > data.expires){
                    return this.del(_name);
                }

                return data.value;
            }else{
                var nameEQ = name + "=";
                var ca = document.cookie.split(';');
                for(var i=0;i < ca.length;i++) {
                    var c = ca[i];
                    while (c.charAt(0)==' ') c = c.substring(1,c.length);
                    if (c.indexOf(nameEQ) == 0) {
                        var raw = c.substring(nameEQ.length,c.length);
                        if(!raw) return null;

                        return JSON.parse(raw);
                    }
                }

                return null;
            }
        }

        Store.prototype.del = function(_name) {
            var name = this.prefix+'_'+_name;

            if( this.localStoreSupport() ) {
                localStorage.removeItem(name);
            }
            else {
                this.set(name,"",-1);
            }

            return null;
        }

        return Store('arp');
    });
})();

(function(){
    'use strict';

    angular.module('ARoutePermission').factory('$arp_permissions',

    /** @ngInject */
    function(){
        function runResolvers(__resolvers, callback){
            if(!__resolvers || !__resolvers.length){ callback(); return; }
            var okCount = 0;
            var done=function(){
                okCount++;
                if(okCount == __resolvers.length) callback();
            }
            for(var i in __resolvers){
                __resolvers[i]().finally(function(){done();});
            }
        }

        return {
            run:function(arPermissions, callback){
                if(!arPermissions.length){ callback(true); return; }
                var _this = this;
                var i = 0;
                var length_permissions = arPermissions.length;

                function __run(){
                    console.log('[ARoutePermission]', 'Running permission:', arPermissions[i]);
                    _this.test(arPermissions[i], function(status, exception){
                        i++;

                        console.log('[ARoutePermission]', 'Permission status:', status, exception || '');

                        if(!status){
                            callback(false, exception);
                        }else{
                            if(i < length_permissions)  __run();
                            else                        callback(true);
                        }
                    });
                }
                __run();
            },
            test:function(permission, callback){
                if(!(this.permissions[permission] instanceof Object)) throw "Permission '"+permission+"' not registered";
                var permission = this.permissions[permission];
                runResolvers(permission.resolvers, function(){
                    var result = permission.test();
                    if(result === true){
                        callback(true);
                    }else if(typeof result === 'object' && result.$$arp){
                        callback(false, result);
                    }else{
                        callback(false);
                    }
                });
            },
            add:function(permission, test, resolvers){
                if(this.permissions[permission]) throw "Permission '"+permission+"' already added";
                this.permissions[permission] = { test:test, resolvers:resolvers };
            },
            permissions:{}
        }
    });
})();

(function(){
    'use strict';

    angular.module('ARoutePermission')
    .service('ARoutePermission',
    /** @ngInject */
    ["$rootScope", "$location", "$arp_permissions", "$arp_storage", "$arp_utils", "$browser", function ($rootScope, $location, $arp_permissions, $arp_storage, $arp_utils, $browser){
        var __REDIRECT_STORAGE_KEY__ = 'redirect';

        var _this = this;

        var __onRedirectResult = null;
        var __onRouteLoaded = null;
        var __onStateLoaded = null;

        // Keep a var with the information if this route is the first requested
        _this.$$is_first_route = true;
        var onSuccess = function(){
            _this.$$is_first_route = false;
            if(updateFirstRouteStatus) updateFirstRouteStatus();
            if(updateFirstStateStatus) updateFirstStateStatus();
        }
        var updateFirstRouteStatus = $rootScope.$on('$routeChangeSuccess', onSuccess);
        var updateFirstStateStatus = $rootScope.$on('$stateChangeSuccess', onSuccess);

        function clearListeners(){
            if(__onRedirectResult) __onRedirectResult();
            if(__onRouteLoaded) __onRouteLoaded();
            if(__onStateLoaded) __onStateLoaded();
        }

        function clearCookie(){
            $arp_storage.del(__REDIRECT_STORAGE_KEY__);
        }

        // Method to setup a listenner for the callback after a redirect by permission
        function setupCallbackForRedirect(){
            var redirectObj = $arp_storage.get(__REDIRECT_STORAGE_KEY__);

            if(!redirectObj) return;

            __onRedirectResult = $rootScope.$on('$$arp__onRedirectResult', function(event, status){
                event.preventDefault(); __onRedirectResult();

                clearCookie();
                _this.$$redirectTo(status?redirectObj.requestedPath:'/');
            });

            function onSuccess(event){
                if( arguments[1]
                    &&  (event.name === '$stateChangeSuccess' && redirectObj.currentPath != arguments[1].url)
                    ||  (event.name === '$routeChangeSuccess' && arguments[1].$$route.originalPath != redirectObj.currentPath)
                ){
                    clearListeners();
                    clearCookie();
                }
            }
            __onRouteLoaded = $rootScope.$on('$routeChangeSuccess', onSuccess);
            __onStateLoaded = $rootScope.$on('$stateChangeSuccess', onSuccess);
        }
        // If the angular was reloaded, verify if still having any redirect in cookie;
        setupCallbackForRedirect();

        /**
         * When a permission returns an error, the redirected page have the possibility of call a method telling
         * to the ARoutePermission that the permission is ready to run again
         */
        this.completed = function (status, fallback){
            if(!$rootScope.$broadcast('$$arp__onRedirectResult', status).defaultPrevented)
                fallback();
        }

        /**
         * Method to register a new permission
         */
        this.register = function (){
            $arp_permissions.add.apply($arp_permissions, arguments);
            return this;
        }

        /**
         * Method to perform the redirections and keep the necessary info
         * to perform the complete action for the permission, if necessary.
         */
        this.$$redirectTo = function (path, pathRequested, parameterName){
            clearListeners();
            console.log('[ARoutePermission]', '$$redirectTo', path, pathRequested, parameterName);

            // If have any route to be loaded after this redirect
            // save it in cookie, if is not using parameterName
            if(pathRequested && !parameterName){

                // Saving the current path requested and the future path
                $arp_storage.set(__REDIRECT_STORAGE_KEY__, {
                    'requestedPath':pathRequested,
                    'currentPath':path
                }, 15);

                setupCallbackForRedirect();

            }else if(pathRequested){
                // Redirect using the parameterName as the reference for redirect
                if(path.indexOf(parameterName)){
                    path = path.replace(new RegExp('[\?|\&]?'+parameterName+'\=([^\&])*'), '');
                }
                path += ((path.indexOf('?')!=-1)?'&':'?') + parameterName + '=' + pathRequested;
            }

            // Redirect to the requested path
            $arp_utils.location.replace(path);
        }
    }]);

})();
