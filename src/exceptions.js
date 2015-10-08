(function(){
    'use strict';

    angular.module('ARoutePermission').factory('ARoutePermissionExceptions',

    /** @ngInject */
    function(ARoutePermission, $location){
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
    });


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
