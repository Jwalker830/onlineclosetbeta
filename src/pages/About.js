import React from "react";

const About = () => {
    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "auto", fontFamily: "Arial, sans-serif" }}>
            <h1 style={{ textAlign: "center" }}>How to use theOnlineCloset</h1>

            <section>
                <h2>1. Create an account</h2>
                <p>
                    a. Click the Login Button and set up an account using your<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;google email.
                </p>
            </section>

            <section>
                <h2>2. Add items</h2>
                <p>
                    a. Take a picture of your item and click, "Click to upload a garment" to select which garments you want uploaded.
                </p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;i. Make sure your clothes are well lit, and the picture has a contrasting background in order for the background to be properly removed.
                </p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;ii. You must add at least 1 top, bottom, and shoe in order to access the closet.
                </p>
                <p>b. Be sure to add a lot of clothes, the more the merrier!</p>
                <p>c. Each item must have at least a title and some tags</p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;i. Titles don't have to be specific but other users will be able to see them.
                </p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;ii. Tags are important, make sure your tagging conventions are consistent across items for best results. ex: "gray" vs "grey" vs "Gray". Each separate tag should be separated by a comma.
                </p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;iii. Your algorithm will be more effective the more granular your tags are. Be as descriptive as you like.
                </p>
            </section>

            <section>
                <h2>3. Develop your Algorithm</h2>
                <p>a. Click on Score random outfits</p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;i. Each outfit will be rated 1-4. Pressing arrow key (or swiping on mobile) Right, Up, Down, and Left will give the outfit a score of 4, 3, 2, and 1, respectively.
                </p>
                <p>
                    &nbsp;&nbsp;&nbsp;&nbsp;ii. The more scoring you do, the better refined your algorithm will be!
                </p>
            </section>

            <section>
                <h2>4. Start creating outfits!</h2>
                <p>a. When your algorithm is refined, the closet will automatically give you a curated outfit.</p>
                <p>b. To save an outfit, click the star next to the displayed outfit.</p>
                <p>c. To share a closet, share the current link.</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;i. To share an outfit, click on the outfit, then share the current link.</p>
                <p>d. Click the lock on a hovered item to lock in an item and curate outfits based on that item.</p>
                <p>e. Add tag names or prompts into the text bar and press enter in order to curate items based on those tags.</p>
            </section>

            <section>
                <h2>5. Log an outfit</h2>
                <p>
                    a. Go to your profile and scroll down to your fit log. Hover on desktop or tap on mobile and then click log outfit in order to log an outfit for that day.
                </p>
                <p>
                    b. You'll be taken to the closet to create your outfit. Once completed, click "Log outfit" to log an outfit for that day.
                </p>
            </section>

            <section>
                <h2>6. Be social!</h2>
                <p>a. Click on the search tab to look up other users. My account is "jtennma" if you want to view my account.</p>
                <p>b. You can follow other accounts in order to have their logs show up on your feed.</p>
                <p>c. You'll be able to access others' closets and create outfits in their closets for fun.</p>
                <p>d. Share outfits/profiles with your friends.</p>
                <p>e. You can view others' wear/log statistics on people's profiles.</p>
            </section>
        </div>
    );
};

export default About;
