export function appHeader() {
  return {
    restrict: "E",
    templateUrl: "/build/partials/header.html",
    replace: true,
    link: function postLink(scope) {
      scope.userMD5 = window.user.md5;
      scope.email = window.user.email;
    },
  };
}

export function appFooter() {
  return {
    restrict: "E",
    templateUrl: "/build/partials/footer.html",
    replace: true,
    link: function postLink(scope) {
      scope.userMD5 = window.user.md5;
      scope.email = window.user.email;
    },
  };
}

export function menuDropdown() {
  return ($scope, element) => {
    $scope.$root.overlayClick = function overlayClick() {
      $scope.$root.showDropdown = false;
      document.querySelectorAll(".dropdown").forEach((el) => {
        el.style.display = "none";
      });
    };
    const activeDropdown = element[0].querySelector(".dropdown");
    element.on("click", (e) => {
      if (
        activeDropdown.style.display === "none" ||
        activeDropdown.style.display === ""
      ) {
        document.querySelectorAll(".dropdown").forEach((el) => {
          el.style.display = "none";
        });
        $scope.$root.showDropdown = true;
        activeDropdown.style.display = "block";
      } else if (e.target === element[0].querySelector("img")) {
        $scope.$root.showDropdown = false;
        activeDropdown.style.display = "none";
      }
      $scope.$apply();
    });
  };
}

export function searchShortcut($document) {
  return ($scope, element) => {
    $document.bind("keypress", (event) => {
      if (event.which === 47) {
        if (["INPUT", "TEXTAREA"].indexOf(document.activeElement.tagName) < 0) {
          element[0].focus();
          event.preventDefault();
        }
      }
    });
  };
}

// angular.module('hostr').directive('clippy', ['files', function factory() {
//   return function(scope, element, attrs) {
//     element = element[0];
//     var client = new ZeroClipboard(element);
//     client.on('ready', function(readyEvent) {
//       element.addEventListener('click', function(event) {
//         event.preventDefault();
//       });
//
//       client.on( 'aftercopy', function( event ) {
//         if (element.innerHTML == 'Copy Link') {
//           element.innerHTML = 'Copied!';
//           setTimeout(function() {
//             if (element) {
//               element.innerHTML = 'Copy Link';
//             }
//           }, 1500);
//         }
//       });
//     });
//   }
// }]);
