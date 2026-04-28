$(function(){
    set__ScrollTop__visibility();  

    $('[data-scroll-top]').on('click', function(){
        
        window.scrollTo({top: 0, behavior: 'smooth'});

    });
});

$(window).on('scroll', function() {

    set__ScrollTop__visibility(); 

});

function set__ScrollTop__visibility() {

    if ($(window).scrollTop() >= $(window).height() / 2) {
        $('[data-scroll-top]').addClass('is--visible');
    } else {
        $('[data-scroll-top]').removeClass('is--visible');
    }

    return true;
}
