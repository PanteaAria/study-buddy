from fastapi import FastAPI, Query, HTTPException
import requests
from bs4 import BeautifulSoup
import uvicorn

app = FastAPI()

TIMETABLE_URL = "https://cgi.cse.unsw.edu.au/~dp1091/25T1/resources/timetable.html"

def parse_timetable(html):
    soup = BeautifulSoup(html, "html.parser")
    
    table = soup.find("table")
    if not table:
        raise ValueError("Could not find timetable table in HTML")

    timetable = []
    
    rows = table.find_all("tr")[1:]  # Skip header row

    for row in rows:
        cols = row.find_all("td")
        if len(cols) >= 5:  # Ensure we have enough columns
            day = cols[0].text.strip()            # Correct: Day of the session (e.g., Tuesday)
            start_time = cols[1].text.strip()      # Correct: Start time (e.g., 1:00pm)
            end_time = cols[2].text.strip()        # Correct: End time (e.g., 2:00pm)
            staff = cols[3].text.strip()           # Correct: Instructor name
            location = cols[4].text.strip()        # Correct: Location (e.g., Online)
            session_type = "Lecture" if "Lecture" in location else "Tutorial"  # Guess based on location

            timetable.append({
                "type": session_type,
                "day": day,
                "time": f"{start_time} - {end_time}",
                "location": location,
                "staff": staff
            })

    return timetable

@app.get("/")
def home():
    """ Root endpoint to check if the API is live """
    return {"message": "Study Buddy API is running! Visit /extract-timetable to get timetable data."}

@app.get("/extract-timetable")
def extract_timetable(url: str = Query(TIMETABLE_URL, description="Timetable page URL")):
    try:
        response = requests.get(url)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch timetable page")
        
        timetable_data = parse_timetable(response.text)
        return {"timetable": timetable_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Force Uvicorn to run on the correct port
    uvicorn.run(app, host="0.0.0.0", port=8000)
