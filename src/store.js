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
