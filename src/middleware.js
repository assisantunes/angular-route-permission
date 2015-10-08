(function(){
    'use strict';

    angular.module('ARoutePermission', []).run(

    /** @ngInject */
    function ($rootScope, $location, $browser, ARoutePermission, ARoutePermissionExceptions, $arp_permissions, $arp_utils){

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

            // Only to test the history in the browser
            window.document.title = url;

            console.log('[ARoutePermission]', 'route successfully changed', url );
        }
        $rootScope.$on('$stateChangeSuccess', onSuccess);
        $rootScope.$on('$routeChangeSuccess', onSuccess);
    });
})();
