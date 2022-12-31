import { json, redirect } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import React from 'react';
import Header, { HeaderStyleLinks } from '~/components/MainHeader/Header';
import { LogoLinks } from '~/components/MainHeader/Logo';
import { ThemeSwitcherLinks } from '~/components/MainHeader/ThemeSwitcher';
import { ModalLinks } from '~/components/Common/Modal/Modal';
import { requireAuth } from '../../server/auth';
import { getRoomDetails, getUser } from '../../server/db';
import { PopOverLinks } from '~/components/Common/Popover/PopOver';

export const links = () => [
  ...HeaderStyleLinks(),
  ...LogoLinks(),
  ...ModalLinks(),
  ...PopOverLinks(),
  ...ThemeSwitcherLinks()
];

export async function loader({ request }) {
  const { uid } = await requireAuth(request);
  const userData = await getUser(uid);
  if (userData.error) {
    return redirect('/');
  } else {
    let roomIds = userData.data.rooms;

    if (roomIds && roomIds.length > 0) {
      let promises = [];
      roomIds.forEach((id) => {
        promises.push(getRoomDetails(id));
      });
      let roomData = await Promise.all(promises);
      return json({ ...userData.data, rooms: roomData });
    } else {
      return json({ ...userData.data, rooms: [] });
    }
  }
}

const MainRoomLinks = [
  {
    link: '/rooms/createRoom',
    text: 'Create Room'
  },
  {
    link: '/rooms/enterRoom',
    text: 'Enter Room'
  },
  {
    link: '/rooms',
    text: 'Room List'
  },
  {
    link: '/rooms/userProfile',
    text: 'Profile'
  }
];

function Rooms() {
  const data = useLoaderData();
  return (
    <>
      <Header headerLinks={MainRoomLinks} isLoggedInUser={true} />
      <Outlet context={data} />
    </>
  );
}

export function CatchBoundary() {
  return (
    <>
      <Header headerLinks={[]} />
      <div className='error-container'>
        <div className='error-page'>
          <span>Something Bad Happened</span>
          <p>
            Go Back to &nbsp;
            <Link className='join-link' to='/'>
              Home
            </Link>
            ?
          </p>
        </div>
      </div>
    </>
  );
}

export default Rooms;
