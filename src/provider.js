(function(){
    'use strict';

    angular.module('ARoutePermission')
    .service('ARoutePermission',
    /** @ngInject */
    function ($rootScope, $location, $arp_permissions, $arp_storage, $arp_utils, $browser){
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
            if(!$rootScope.$broadcast('$$arp__onRedirectResult', status).defaultPrevented){
                if(typeof fallback == 'function') fallback();
            }
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
    });

})();
