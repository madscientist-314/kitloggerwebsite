var root = document.documentElement;

function colorSwitch(theme, page) {
    if (theme === 'dark') {
        if (page === 'hire') {
            root.style.setProperty('--primary', '#fff');
        } else if (page === 'faqs') {
            document.body.style.backgroundColor = '#444';
            document.body.style.color = '#fff';
        } else if (page === 'contact') {    
            document.body.style.backgroundColor = '#555';
            document.body.style.color = '#fff';
        } else if (page === 'login') {
            document.body.style.backgroundColor = '#666';
            document.body.style.color = '#fff'; 
        } else {
            document.body.style.backgroundColor = '#666';
            document.body.style.color = '#fff';
        }
    }
}