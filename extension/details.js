GN// Details Page Script
// Displays full threat analysis details

// Get data from URL parameters
const params = new URLSearchParams(window.location.search);
const dataStr = params.get('data');

console.log('Details page loaded');
console.log('Data string:', dataStr);

if (dataStr) {
  try {
    const data = JSON.parse(decodeURIComponent(dataStr));
    console.log('Parsed data:', data);

    // Populate summary
    document.getElementById('summary').textContent = data.summary || 'Suspicious content detected.';

    // Populate red flags
    if (data.details && data.details.length > 0) {
      const list = document.getElementById('redFlagsList');
      list.innerHTML = ''; // Clear loading state
      data.details.forEach(detail => {
        const li = document.createElement('li');
        li.textContent = detail;
        list.appendChild(li);
      });
    } else {
      document.getElementById('redFlagsSection').style.display = 'none';
    }

    // Populate recommendation
    if (data.recommendation) {
      document.getElementById('recommendation').innerHTML = data.recommendation.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    } else {
      document.getElementById('recommendationSection').style.display = 'none';
    }

    // Populate meta info
    if (data.method) {
      const methodText = data.method === 'ai' ? 'AI-Powered Detection' :
                        data.method === 'timeout' ? 'Timeout' :
                        data.method === 'error' ? 'Error' : 'Pattern Matching';
      document.getElementById('method').textContent = methodText;
    }

    if (data.contentLength) {
      const kb = (data.contentLength / 1000).toFixed(1);
      document.getElementById('contentSize').textContent = `${kb} KB`;
    }

    if (data.url) {
      document.getElementById('pageUrl').textContent = data.url;
    }

    if (data.timestamp) {
      const date = new Date(data.timestamp);
      document.getElementById('timestamp').textContent = date.toLocaleString();
    }

  } catch (error) {
    console.error('Failed to parse data:', error);
    console.error('Error details:', error.message);
    document.getElementById('summary').textContent = 'Failed to load analysis details. Error: ' + error.message;
  }
} else {
  console.log('No data parameter found in URL');
  document.getElementById('summary').textContent = 'No analysis data provided.';
}
