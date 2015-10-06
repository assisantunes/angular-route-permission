(function(){
    'use strict';

    angular.module('PermissionManager').service('PermissionManager',

    /** @ngInject */
    function ($rootScope, $location, $permissions, ipCookie, $locationUtil, $browser){
        var _this = this;
        var __REDIRECT_COOKIE_KEY__ = _this.__REDIRECT_COOKIE_KEY__ = '__permission_manager_redirect';

        var __onRedirectResult = null;
        var __onRouteLoaded = null;

        var _next_path = null;

        // Keep a var with the information if this route is the first requested
        _this.$$is_first_route = true;
        var updateFirstRouteStatus = $rootScope.$on('$routeChangeSuccess', function(event, next, current){
            _this.$$is_first_route = false; updateFirstRouteStatus();
        });

        /**
         * When a permission returns an error, the redirected page have the possibility of call a method telling
         * to the PermissionManager that the permission is ready to run again
         */
        this.completed = function(status, fallback){
            if(!$rootScope.$broadcast('__on_redirect_result', status).defaultPrevented) fallback();
        }

        /**
         * Method to register a new permission
         */
        this.register = function(){
            $permissions.__add_permission.apply($permissions, arguments);
        }

        function clearListeners(clear_cookie_redirect){
            if(__onRedirectResult) __onRedirectResult();
            if(__onRouteLoaded) __onRouteLoaded();

            if(clear_cookie_redirect) clearCookie();
        }

        function clearCookie(){
            ipCookie.remove(__REDIRECT_COOKIE_KEY__);
        }

        // Method to setup a listenner for the callback after a redirect by permission
        function setupCallbackForRedirect(){
            var redirect_obj = ipCookie(__REDIRECT_COOKIE_KEY__);

            if(!redirect_obj) return;

            __onRedirectResult = $rootScope.$on('__on_redirect_result', function(event, status){
                event.preventDefault(); __onRedirectResult();

                clearCookie();
                _this.$$redirectTo(status?redirect_obj.requested_path:'/');
            });
            __onRouteLoaded = $rootScope.$on('$routeChangeSuccess', function(event, next, current){
                if(next && next.$$route.originalPath != redirect_obj.current_path) clearListeners(true);
            });
        }

        // If the angular was reloaded, verify if still having any redirect in cookie;
        setupCallbackForRedirect();

        this.$$redirectTo = function(path, path_requested, parameter_name){
            clearListeners();
            console.log('[PermissionManager]', '$$redirectTo', path, path_requested, parameter_name);

            // If have any route to be loaded after this redirect
            // save it in cookie, if is not using parameter_name
            if(path_requested && !parameter_name){
                // Saving the current path requested and the future path
                ipCookie(__REDIRECT_COOKIE_KEY__, {
                    'requested_path':path_requested,
                    'current_path':path
                }, {path:'/', expires:7});

                setupCallbackForRedirect();
            }else if(path_requested){
                // Redirect using the parameter_name as the reference for redirect
                var redirect_url = $locationUtil._normalize(path_requested);
                path += ((path.indexOf('?')!=-1)?'&':'?') + parameter_name + '=' + redirect_url;
            }

            // Redirect to the requested path
            $locationUtil.replace(path);
        }

        function runValidateRoute(route, current, callback){
            $permissions.run(route.permissions, function(status, exception){
                if(!status){
                    exception.$$do(route);
                }else{ callback(true); }
            });
        }

        $rootScope.$on("$locationChangeStart", function(event, next, current) {
            if(event.defaultPrevented) return;

            console.log('$locationChangeStart', next);
            var currentReplace = $location.$$replace;
            var route = $locationUtil.get_route_by_path(next);

            // Checking if exists some permissions to access this route
            if(route && route.permissions && route.permissions.length > 0){

                // Wait if the test validation is not happen
                event.preventDefault(); //Stop

                runValidateRoute(route, current, function(status){
                    if(status){
                        $browser.url(next, currentReplace);
                        $rootScope.$evalAsync(function() {
                            $location.$$parse(next);
                            $rootScope.$broadcast('$locationChangeSuccess', next, current);
                        });
                        if (!$rootScope.$$phase) $rootScope.$digest();
                    }
                });
            }
        });

        $rootScope.$on('$routeChangeError', function(event, current, previous, rejection){
            // Listening the PermissionManager exception
            if(rejection.$$permission_manager){
                console.log('[PermissionManager]', '$routeChangeError');
                if(typeof event.preventDefault == 'function') event.preventDefault();
                if(typeof event.stopPropagation == 'function') event.stopPropagation();
                rejection.$$do();
            }
        });

        $rootScope.$on('$routeChangeSuccess', function(event, next, last){
            var path = '';
            try{ path = next.$$route.__path; }catch(err){}

            console.log('[PermissionManager]', '$routeChangeSuccess', path );
        });
    });

})();
